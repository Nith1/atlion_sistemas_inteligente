import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  concluirAtivacaoCognitiva,
  concluirEstudo,
  concluirLeiSeca,
  concluirJurisprudencia,
  concluirConsolidacao,
  concluirQuestoes,
  pausarEtapa,
  retomarEtapa,
} from "./actions";
import { Cronometro, TempoTotalHoje } from "./cronometro";

const ETAPA_LABELS: Record<string, string> = {
  ativacao_cognitiva: "Ativação Cognitiva",
  estudo: "Estudo",
  lei_seca: "Lei Seca",
  jurisprudencia: "Jurisprudência",
  exercicios: "Exercícios",
  laboratorio: "Laboratório",
  questoes: "Questões",
};

// Peso relativo de cada etapa dentro de uma sessão — usado só pra dividir o
// tempo disponível do dia entre as etapas (não é tempo fixo em minutos).
const PESO_ETAPA: Record<string, number> = {
  ativacao_cognitiva: 10,
  estudo: 25,
  lei_seca: 15,
  jurisprudencia: 15,
  exercicios: 20,
  laboratorio: 20,
  questoes: 20,
};

const CONSOLIDACAO_INSTRUCAO: Record<string, string> = {
  exercicios: "Resolva exercícios sobre esse assunto no seu material.",
  laboratorio: "Pratique em laboratório/simulador esse assunto.",
};

const ATIVACAO_MODO_LABEL: Record<string, string> = {
  questoes: "Refaça algumas questões desses assuntos.",
  anki: "Revise esses assuntos no Anki.",
  questoes_anki: "Refaça questões e revise no Anki esses assuntos.",
};

type Etapa = {
  id: string;
  tipo: string;
  ordem: number;
  concluida: boolean;
  assunto_id: string | null;
  iniciada_em: string | null;
  tempo_gasto_segundos: number | null;
  tempo_acumulado_segundos: number;
};

export default async function SessaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sessao } = await supabase
    .from("sessoes")
    .select("id, disciplina_id")
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (!sessao) redirect("/painel");

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("id, nome, tipo")
    .eq("id", sessao.disciplina_id)
    .single();

  const { data: etapasData } = await supabase
    .from("sessao_etapas")
    .select("id, tipo, ordem, concluida, assunto_id, iniciada_em, tempo_gasto_segundos, tempo_acumulado_segundos")
    .eq("sessao_id", sessao.id)
    .order("ordem", { ascending: true });

  const etapas = (etapasData ?? []) as Etapa[];
  const etapaAtual = etapas.find((e) => !e.concluida);

  if (!disciplina || !etapaAtual) redirect("/painel");

  const etapaIndex = etapas.findIndex((e) => e.id === etapaAtual.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("ativacao_modo, horas_liquidas_dia")
    .eq("id", user.id)
    .single();

  const { count: disciplinasAtivas } = await supabase
    .from("disciplinas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("ativa", true);

  // Divide as horas líquidas do dia entre as disciplinas ativas (uma sessão
  // por disciplina) e, dentro dessa sessão, entre as etapas — proporcional
  // ao peso de cada uma. É só uma sugestão: o estudante pode ficar mais ou
  // menos tempo em cada etapa.
  const minutosPorSessao = profile?.horas_liquidas_dia
    ? (profile.horas_liquidas_dia * 60) / Math.max(1, disciplinasAtivas ?? 1)
    : null;
  const pesoTotalSessao = etapas.reduce((soma, e) => soma + (PESO_ETAPA[e.tipo] ?? 0), 0);

  function sugeridoMinutos(tipo: string): number | undefined {
    const peso = PESO_ETAPA[tipo];
    if (peso === undefined) return undefined;
    if (!minutosPorSessao || !pesoTotalSessao) return peso;
    return Math.max(2, Math.round((peso / pesoTotalSessao) * minutosPorSessao));
  }

  // tempo total estudado hoje: soma o que já foi concluído hoje + o que a
  // etapa atual (em andamento) já rendeu até agora
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const { data: etapasHoje } = await supabase
    .from("sessao_etapas")
    .select("tempo_gasto_segundos, concluida_em, sessoes!inner(user_id)")
    .eq("sessoes.user_id", user.id)
    .gte("concluida_em", inicioHoje.toISOString());

  const tempoBaseHojeSegundos = (etapasHoje ?? []).reduce(
    (soma, e) => soma + (e.tempo_gasto_segundos ?? 0),
    0
  );

  let conteudo: React.ReactNode = null;

  if (etapaAtual.tipo === "ativacao_cognitiva") {
    const { data: candidatos } = await supabase
      .from("assuntos")
      .select("id, nome, ultima_vez_estudado")
      .eq("disciplina_id", disciplina.id)
      .eq("ja_estudado", true)
      .order("ultima_vez_estudado", { ascending: true, nullsFirst: true })
      .limit(5);

    const modo = profile?.ativacao_modo ?? "questoes";

    conteudo =
      candidatos && candidatos.length > 0 ? (
        <form action={concluirAtivacaoCognitiva.bind(null, etapaAtual.id, sessao.id)}>
          <p className="text-sm text-foreground/70">{ATIVACAO_MODO_LABEL[modo]}</p>
          <ul className="mt-4 space-y-2">
            {candidatos.map((assunto) => (
              <li
                key={assunto.id}
                className="rounded-md border border-foreground/10 bg-foreground/3 px-3 py-2 text-sm"
              >
                <input type="hidden" name="assuntoId" value={assunto.id} />
                {assunto.nome}
              </li>
            ))}
          </ul>
          <button
            type="submit"
            className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
          >
            Concluí a revisão
          </button>
        </form>
      ) : (
        <form action={concluirAtivacaoCognitiva.bind(null, etapaAtual.id, sessao.id)}>
          <p className="text-sm text-foreground/60">
            Ainda não há assuntos estudados nessa disciplina pra reforçar. Sem problema —
            vamos direto pro estudo de hoje.
          </p>
          <button
            type="submit"
            className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
          >
            Continuar
          </button>
        </form>
      );
  }

  if (etapaAtual.tipo === "estudo") {
    const { data: proximoAssunto } = await supabase
      .from("assuntos")
      .select("id, nome")
      .eq("disciplina_id", disciplina.id)
      .eq("ja_estudado", false)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle();

    conteudo = (
      <form action={concluirEstudo.bind(null, etapaAtual.id, sessao.id, proximoAssunto?.id ?? null)}>
        {proximoAssunto ? (
          <>
            <p className="text-sm text-foreground/60">Estude esse assunto no seu material (curso, livro, videoaula):</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{proximoAssunto.nome}</p>
          </>
        ) : (
          <p className="text-sm text-foreground/60">
            Você já estudou todos os assuntos cadastrados dessa disciplina — hora de reforçar o
            que já viu.
          </p>
        )}
        <button
          type="submit"
          className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          {proximoAssunto ? "Concluí o estudo" : "Continuar"}
        </button>
      </form>
    );
  }

  if (etapaAtual.tipo === "lei_seca") {
    const assunto = etapaAtual.assunto_id
      ? (
          await supabase
            .from("assuntos")
            .select("nome, lei_referencia, progresso_lei_seca")
            .eq("id", etapaAtual.assunto_id)
            .single()
        ).data
      : null;

    conteudo = (
      <form action={concluirLeiSeca.bind(null, etapaAtual.id, sessao.id, etapaAtual.assunto_id)}>
        {assunto && <p className="text-xl font-semibold text-foreground">{assunto.nome}</p>}

        <div className="mt-4">
          <label className="block text-xs text-foreground/50">Qual lei</label>
          <input
            name="leiReferencia"
            type="text"
            defaultValue={assunto?.lei_referencia ?? ""}
            placeholder="Ex: Lei nº 8.112/1990"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        {assunto?.progresso_lei_seca && (
          <p className="mt-3 text-sm text-foreground/60">
            Você parou em: <span className="font-medium text-foreground">{assunto.progresso_lei_seca}</span>. Leia a
            partir daí.
          </p>
        )}

        <div className="mt-4">
          <label className="block text-xs text-foreground/50">Até onde você leu agora</label>
          <input
            name="progresso"
            type="text"
            placeholder="Ex: Art. 42"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <button
          type="submit"
          className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Concluir
        </button>
      </form>
    );
  }

  if (etapaAtual.tipo === "jurisprudencia") {
    const assunto = etapaAtual.assunto_id
      ? (
          await supabase
            .from("assuntos")
            .select("nome, jurisprudencia_referencia, progresso_jurisprudencia")
            .eq("id", etapaAtual.assunto_id)
            .single()
        ).data
      : null;

    conteudo = (
      <form action={concluirJurisprudencia.bind(null, etapaAtual.id, sessao.id, etapaAtual.assunto_id)}>
        {assunto && <p className="text-xl font-semibold text-foreground">{assunto.nome}</p>}

        <div className="mt-4">
          <label className="block text-xs text-foreground/50">Qual jurisprudência/tema</label>
          <input
            name="referencia"
            type="text"
            defaultValue={assunto?.jurisprudencia_referencia ?? ""}
            placeholder="Ex: STF, controle de constitucionalidade"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        {assunto?.progresso_jurisprudencia && (
          <p className="mt-3 text-sm text-foreground/60">
            Você parou em:{" "}
            <span className="font-medium text-foreground">{assunto.progresso_jurisprudencia}</span>. Continue a
            partir daí.
          </p>
        )}

        <div className="mt-4">
          <label className="block text-xs text-foreground/50">Até onde você revisou agora</label>
          <input
            name="progresso"
            type="text"
            placeholder="Ex: Súmulas do STJ até 2023"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>

        <button
          type="submit"
          className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Concluir
        </button>
      </form>
    );
  }

  if (etapaAtual.tipo === "exercicios" || etapaAtual.tipo === "laboratorio") {
    const assunto = etapaAtual.assunto_id
      ? (await supabase.from("assuntos").select("nome").eq("id", etapaAtual.assunto_id).single()).data
      : null;

    conteudo = (
      <form action={concluirConsolidacao.bind(null, etapaAtual.id, sessao.id)}>
        <p className="text-sm text-foreground/60">{CONSOLIDACAO_INSTRUCAO[etapaAtual.tipo]}</p>
        {assunto && <p className="mt-2 text-xl font-semibold text-foreground">{assunto.nome}</p>}
        <button
          type="submit"
          className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Concluir
        </button>
      </form>
    );
  }

  if (etapaAtual.tipo === "questoes") {
    const assunto = etapaAtual.assunto_id
      ? (await supabase.from("assuntos").select("nome").eq("id", etapaAtual.assunto_id).single()).data
      : null;

    conteudo = (
      <form
        action={concluirQuestoes.bind(
          null,
          etapaAtual.id,
          sessao.id,
          disciplina.id,
          etapaAtual.assunto_id
        )}
      >
        <p className="text-sm text-foreground/60">
          Resolva questões {assunto ? "sobre" : "dessa disciplina"}{" "}
          {assunto && <span className="font-medium text-foreground">{assunto.nome}</span>} no seu material e
          registre o resultado:
        </p>
        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-foreground/50">Acertos</label>
            <input
              name="certas"
              type="number"
              min={0}
              defaultValue={0}
              required
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-foreground/50">Erros</label>
            <input
              name="erradas"
              type="number"
              min={0}
              defaultValue={0}
              required
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Concluir sessão
        </button>
      </form>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-3 h-1 w-full rounded-full bg-foreground/10">
          <div
            className="h-1 rounded-full bg-gold transition-all"
            style={{ width: `${((etapaIndex + 1) / etapas.length) * 100}%` }}
          />
        </div>
        <TempoTotalHoje
          baseSegundos={tempoBaseHojeSegundos}
          etapaAtualAcumulado={etapaAtual.tempo_acumulado_segundos}
          iniciadaEmAtual={etapaAtual.iniciada_em}
        />

        <div className="mt-7 flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground/50">
              {disciplina.nome} · etapa {etapaIndex + 1} de {etapas.length}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">
              {ETAPA_LABELS[etapaAtual.tipo] ?? etapaAtual.tipo}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Cronometro
              tempoAcumuladoSegundos={etapaAtual.tempo_acumulado_segundos}
              iniciadaEm={etapaAtual.iniciada_em}
              sugeridoMinutos={sugeridoMinutos(etapaAtual.tipo)}
            />
            {etapaAtual.iniciada_em ? (
              <form action={pausarEtapa.bind(null, etapaAtual.id)}>
                <button
                  type="submit"
                  title="Pausar"
                  aria-label="Pausar cronômetro"
                  className="rounded-full p-1.5 text-foreground/50 ring-1 ring-foreground/10 hover:text-foreground hover:ring-foreground/30"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="3" y="2" width="3" height="10" />
                    <rect x="8" y="2" width="3" height="10" />
                  </svg>
                </button>
              </form>
            ) : (
              <form action={retomarEtapa.bind(null, etapaAtual.id)}>
                <button
                  type="submit"
                  title="Retomar"
                  aria-label="Retomar cronômetro"
                  className="rounded-full p-1.5 text-foreground/50 ring-1 ring-foreground/10 hover:text-foreground hover:ring-foreground/30"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M3 2 L12 7 L3 12 Z" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6">{conteudo}</div>
      </div>
    </main>
  );
}
