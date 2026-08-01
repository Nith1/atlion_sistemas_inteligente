import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CRONOMETRO_SEGUNDOS } from "@/lib/tempo";
import { JANELA_ATIVACAO_TAMANHO, type Peso } from "@/lib/janela-ativacao";
import { SessaoRuntime } from "./sessao-runtime";
import type { SessaoBundle } from "@/lib/sessao-offline/tipos";

type EtapaRow = {
  id: string;
  tipo: string;
  ordem: number;
  concluida: boolean;
  assunto_id: string | null;
  iniciada_em: string | null;
  tempo_gasto_segundos: number | null;
  tempo_acumulado_segundos: number;
  minutos_ajustados: number | null;
};

const CAMPOS_ASSUNTO =
  "id, nome, progresso_estudo, lei_referencia, progresso_lei_seca, jurisprudencia_referencia, progresso_jurisprudencia";

// Etapas que, em algum momento do pipeline, mostram informação de um
// assunto específico — enquanto alguma delas não tiver sido concluída, a
// sessão precisa ter um "assunto do dia" pronto (ver assuntoSelecionado
// abaixo), buscado de uma vez só, pra continuar funcionando offline.
const TIPOS_QUE_USAM_ASSUNTO = ["estudo", "lei_seca", "jurisprudencia", "exercicios", "laboratorio", "questoes"];

export default async function SessaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sessao } = await supabase
    .from("sessoes")
    .select("id, disciplina_id, ajuste_tempo, tipo")
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (!sessao) redirect("/painel");

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select(
      "id, nome, tipo, leis_principais, progresso_lei_seca, jurisprudencias_principais, progresso_jurisprudencia"
    )
    .eq("id", sessao.disciplina_id)
    .single();

  const { data: etapasData } = await supabase
    .from("sessao_etapas")
    .select(
      "id, tipo, ordem, concluida, assunto_id, iniciada_em, tempo_gasto_segundos, tempo_acumulado_segundos, minutos_ajustados"
    )
    .eq("sessao_id", sessao.id)
    .order("ordem", { ascending: true });

  const etapas = (etapasData ?? []) as EtapaRow[];
  const etapaAtual = etapas.find((e) => !e.concluida);

  if (!disciplina || !etapaAtual) redirect("/painel");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ativacao_modo")
    .eq("id", user.id)
    .single();

  // tempo total estudado hoje: soma o que já foi concluído hoje (em
  // qualquer sessão/disciplina) — o que essa sessão render localmente por
  // cima disso fica por conta de sessao-runtime.tsx.
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const { data: etapasHoje } = await supabase
    .from("sessao_etapas")
    .select("tempo_gasto_segundos, concluida_em, sessoes!inner(user_id)")
    .eq("sessoes.user_id", user.id)
    .gte("concluida_em", inicioHoje.toISOString());

  const tempoBaseHojeSegundos = (etapasHoje ?? []).reduce(
    (soma, e) => soma + Math.min(e.tempo_gasto_segundos ?? 0, LIMITE_CRONOMETRO_SEGUNDOS),
    0
  );

  // Prefetch de tudo que a sessão pode vir a precisar — não só a etapa
  // atual — pra continuar funcionando sem nenhuma leitura nova ao servidor
  // se a internet cair no meio (ver src/lib/sessao-offline).
  const ativacaoPendente = etapas.some((e) => e.tipo === "ativacao_cognitiva" && !e.concluida);
  // Janela móvel: os N assuntos mais recentemente introduzidos (ordem desc
  // entre os já estudados — ver src/lib/janela-ativacao.ts), não os mais
  // "atrasados" como antes.
  const { data: candidatosAtivacao } = ativacaoPendente
    ? await supabase
        .from("assuntos")
        .select("id, nome")
        .eq("disciplina_id", disciplina.id)
        .eq("ja_estudado", true)
        .order("ordem", { ascending: false })
        .limit(JANELA_ATIVACAO_TAMANHO)
    : { data: [] as { id: string; nome: string }[] };

  // "Assunto do dia" só existe em sessão normal — numa Sessão de
  // Consolidação não há conteúdo novo, então a etapa "questoes" usa
  // assuntosConsolidacao (múltiplos assuntos com peso) em vez disso.
  const precisaDeAssunto =
    sessao.tipo === "normal" && etapas.some((e) => TIPOS_QUE_USAM_ASSUNTO.includes(e.tipo) && !e.concluida);
  let assuntoSelecionado: SessaoBundle["assuntoSelecionado"] = null;

  if (precisaDeAssunto) {
    const assuntoIdConhecido = etapas.find((e) => e.assunto_id)?.assunto_id ?? null;

    const { data } = assuntoIdConhecido
      ? await supabase.from("assuntos").select(CAMPOS_ASSUNTO).eq("id", assuntoIdConhecido).single()
      : await supabase
          .from("assuntos")
          .select(CAMPOS_ASSUNTO)
          .eq("disciplina_id", disciplina.id)
          .eq("ja_estudado", false)
          .order("ordem", { ascending: true })
          .limit(1)
          .maybeSingle();

    assuntoSelecionado = data
      ? {
          id: data.id,
          nome: data.nome,
          progressoEstudo: data.progresso_estudo,
          leiReferencia: data.lei_referencia,
          progressoLeiSeca: data.progresso_lei_seca,
          jurisprudenciaReferencia: data.jurisprudencia_referencia,
          progressoJurisprudencia: data.progresso_jurisprudencia,
        }
      : null;
  }

  // Consolidação/Validação: a etapa "questoes" cobre vários assuntos com
  // peso (ver sessao_etapa_assuntos, populado por criarPipelineConsolidacao
  // em src/lib/janela-ativacao.ts ou por criarPipelineValidacao em
  // src/lib/simulado.ts — a única diferença é qual coluna de peso vem
  // preenchida, peso categórico ou peso_percentual).
  const questoesRevisaoGlobalPendente =
    (sessao.tipo === "consolidacao" || sessao.tipo === "validacao") &&
    etapas.some((e) => e.tipo === "questoes" && !e.concluida);
  let assuntosRevisaoGlobal: SessaoBundle["assuntosRevisaoGlobal"] = [];

  if (questoesRevisaoGlobalPendente) {
    const etapaQuestoes = etapas.find((e) => e.tipo === "questoes");

    const { data: pesos } = etapaQuestoes
      ? await supabase
          .from("sessao_etapa_assuntos")
          .select("assunto_id, peso, peso_percentual")
          .eq("etapa_id", etapaQuestoes.id)
      : { data: [] as { assunto_id: string; peso: string | null; peso_percentual: number | null }[] };

    const assuntoIdsRevisao = (pesos ?? []).map((p) => p.assunto_id);
    const { data: assuntosData } =
      assuntoIdsRevisao.length > 0
        ? await supabase.from("assuntos").select(CAMPOS_ASSUNTO).in("id", assuntoIdsRevisao)
        : { data: [] as { id: string; nome: string; lei_referencia: string | null; progresso_lei_seca: string | null; jurisprudencia_referencia: string | null; progresso_jurisprudencia: string | null }[] };

    const assuntoPorId = new Map((assuntosData ?? []).map((a) => [a.id, a]));

    assuntosRevisaoGlobal = (pesos ?? [])
      .map((p) => {
        const a = assuntoPorId.get(p.assunto_id);
        if (!a) return null;
        return {
          id: a.id,
          nome: a.nome,
          peso: p.peso as Peso | null,
          pesoPercentual: p.peso_percentual,
          leiReferencia: a.lei_referencia,
          progressoLeiSeca: a.progresso_lei_seca,
          jurisprudenciaReferencia: a.jurisprudencia_referencia,
          progressoJurisprudencia: a.progresso_jurisprudencia,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  }

  // Consolidação/Validação: revisão do Caderno de Erros da disciplina
  // inteira, agrupada por assunto (mesmo padrão de caderno-erros/page.tsx,
  // sem filtro de sessão — aqui é a disciplina toda de uma vez).
  const revisaoErrosPendente =
    (sessao.tipo === "consolidacao" || sessao.tipo === "validacao") &&
    etapas.some((e) => e.tipo === "revisao_erros" && !e.concluida);
  let errosPendentesConsolidacao: SessaoBundle["errosPendentesConsolidacao"] = [];

  if (revisaoErrosPendente) {
    const { data: errosData } = await supabase
      .from("questoes_registro")
      .select("assunto_id, anotacao")
      .eq("user_id", user.id)
      .eq("disciplina_id", disciplina.id)
      .eq("acertou", false)
      .eq("revisado", false);

    const assuntoIdsErros = [
      ...new Set((errosData ?? []).map((e) => e.assunto_id).filter((id): id is string => !!id)),
    ];
    const { data: assuntosErrosData } =
      assuntoIdsErros.length > 0
        ? await supabase.from("assuntos").select("id, nome").in("id", assuntoIdsErros)
        : { data: [] as { id: string; nome: string }[] };
    const nomePorAssuntoId = new Map((assuntosErrosData ?? []).map((a) => [a.id, a.nome]));

    const grupos = new Map<string, SessaoBundle["errosPendentesConsolidacao"][number]>();
    for (const erro of errosData ?? []) {
      const chave = erro.assunto_id ?? "sem-assunto";
      const existente = grupos.get(chave);
      if (existente) {
        existente.quantidade += 1;
        existente.anotacao = existente.anotacao ?? erro.anotacao;
      } else {
        grupos.set(chave, {
          assuntoId: erro.assunto_id,
          assuntoNome: erro.assunto_id ? (nomePorAssuntoId.get(erro.assunto_id) ?? null) : null,
          quantidade: 1,
          anotacao: erro.anotacao,
        });
      }
    }
    errosPendentesConsolidacao = [...grupos.values()];
  }

  const bundle: SessaoBundle = {
    sessaoId: sessao.id,
    sessaoTipo:
      sessao.tipo === "consolidacao" ? "consolidacao" : sessao.tipo === "validacao" ? "validacao" : "normal",
    disciplinaId: disciplina.id,
    disciplinaNome: disciplina.nome,
    leisPrincipais: disciplina.leis_principais,
    progressoLeiSecaDisciplina: disciplina.progresso_lei_seca,
    jurisprudenciasPrincipais: disciplina.jurisprudencias_principais,
    progressoJurisprudenciaDisciplina: disciplina.progresso_jurisprudencia,
    ajusteTempo: sessao.ajuste_tempo ?? 1,
    ativacaoModo: profile?.ativacao_modo ?? "questoes",
    etapas: etapas.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      ordem: e.ordem,
      concluida: e.concluida,
      assuntoId: e.assunto_id,
      iniciadaEm: e.iniciada_em,
      tempoGastoSegundos: e.tempo_gasto_segundos,
      tempoAcumuladoSegundos: Math.min(e.tempo_acumulado_segundos, LIMITE_CRONOMETRO_SEGUNDOS),
      minutosAjustados: e.minutos_ajustados,
    })),
    candidatosAtivacao: candidatosAtivacao ?? [],
    assuntoSelecionado,
    assuntosRevisaoGlobal,
    errosPendentesConsolidacao,
    tempoBaseHojeSegundos,
  };

  // key=sessaoId: troca de sessão (ex: encadeamento automático pro próximo
  // ciclo do dia, ver tentarEncadearProximaSessao em sessao/actions.ts) tem
  // que remontar o componente do zero, senão o estado local — inicializado só
  // uma vez, de propósito (ver comentário no useState de SessaoRuntime) —
  // ficaria preso na sessão anterior, já encerrada.
  return <SessaoRuntime key={sessao.id} bundle={bundle} />;
}
