import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CRONOMETRO_SEGUNDOS } from "@/lib/tempo";
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
    .select("id, disciplina_id, ajuste_tempo")
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (!sessao) redirect("/painel");

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("id, nome, tipo, lei_principal, progresso_lei_seca")
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
  const ativacaoPendente = !etapas.find((e) => e.tipo === "ativacao_cognitiva")?.concluida;
  const { data: candidatosAtivacao } = ativacaoPendente
    ? await supabase
        .from("assuntos")
        .select("id, nome")
        .eq("disciplina_id", disciplina.id)
        .eq("ja_estudado", true)
        .order("ultima_vez_estudado", { ascending: true, nullsFirst: true })
        .limit(5)
    : { data: [] as { id: string; nome: string }[] };

  const precisaDeAssunto = etapas.some((e) => TIPOS_QUE_USAM_ASSUNTO.includes(e.tipo) && !e.concluida);
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

  const bundle: SessaoBundle = {
    sessaoId: sessao.id,
    disciplinaId: disciplina.id,
    disciplinaNome: disciplina.nome,
    leiPrincipal: disciplina.lei_principal,
    progressoLeiSecaDisciplina: disciplina.progresso_lei_seca,
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
    tempoBaseHojeSegundos,
  };

  return <SessaoRuntime bundle={bundle} />;
}
