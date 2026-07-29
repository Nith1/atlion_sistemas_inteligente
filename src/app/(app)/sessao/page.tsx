import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  concluirAtivacaoCognitiva,
  concluirEstudo,
  continuarEstudoDepois,
  concluirDescanso,
  concluirLeiSeca,
  concluirJurisprudencia,
  concluirConsolidacao,
  concluirQuestoes,
  pausarEtapa,
  retomarEtapa,
} from "./actions";
import { Cronometro, TempoAcumulado } from "./cronometro";
import { SubmitButton } from "@/components/ui/submit-button";
import { ETAPA_LABELS, MINUTOS_SUGERIDOS, SUGERIDO_LABEL } from "@/lib/etapas";
import { LIMITE_CRONOMETRO_SEGUNDOS } from "@/lib/tempo";

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
  minutos_ajustados: number | null;
};

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

  const ajusteTempo = sessao.ajuste_tempo ?? 1;

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

  const etapas = (etapasData ?? []) as Etapa[];
  const etapaAtual = etapas.find((e) => !e.concluida);

  if (!disciplina || !etapaAtual) redirect("/painel");

  // defensivo, igual ao tempoBaseHojeSegundos: uma etapa antiga que ficou
  // rodando por horas antes do teto de segurança não deve inflar a exibição.
  const acumuladoEtapaAtual = Math.min(etapaAtual.tempo_acumulado_segundos, LIMITE_CRONOMETRO_SEGUNDOS);

  const etapaIndex = etapas.findIndex((e) => e.id === etapaAtual.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("ativacao_modo")
    .eq("id", user.id)
    .single();

  // tempo total estudado hoje: soma o que já foi concluído hoje + o que a
  // etapa atual (em andamento) já rendeu até agora
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const { data: etapasHoje } = await supabase
    .from("sessao_etapas")
    .select("tempo_gasto_segundos, concluida_em, sessoes!inner(user_id)")
    .eq("sessoes.user_id", user.id)
    .gte("concluida_em", inicioHoje.toISOString());

  // o Math.min é defensivo: protege contra etapas antigas que ficaram com
  // o cronômetro rodando por horas antes do teto de segurança existir.
  const tempoBaseHojeSegundos = (etapasHoje ?? []).reduce(
    (soma, e) => soma + Math.min(e.tempo_gasto_segundos ?? 0, LIMITE_CRONOMETRO_SEGUNDOS),
    0
  );

  // igual ao "hoje", mas só dessa sessão (uma disciplina) — pra quando o
  // aluno gira o ciclo mais de uma vez no mesmo dia e quer saber quanto
  // tempo levou só aqui, sem misturar com o total do dia inteiro.
  const tempoBaseSessaoSegundos = etapas.reduce(
    (soma, e) => soma + (e.concluida ? Math.min(e.tempo_gasto_segundos ?? 0, LIMITE_CRONOMETRO_SEGUNDOS) : 0),
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
    const mostrarQuestoes = modo === "questoes" || modo === "questoes_anki";
    const mostrarAnki = modo === "anki" || modo === "questoes_anki";

    const camposDesempenho = (
      <div className="mt-4 space-y-3">
        {mostrarQuestoes && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-foreground/50">Acertos</label>
              <input
                name="certas"
                type="number"
                min={0}
                defaultValue={0}
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
                className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
        )}
        {mostrarAnki && (
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            <input name="anki" type="checkbox" className="h-4 w-4 rounded border-foreground/30" />
            Revisei no Anki hoje
          </label>
        )}
      </div>
    );

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
          {camposDesempenho}
          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluí a revisão
          </SubmitButton>
        </form>
      ) : (
        <form action={concluirAtivacaoCognitiva.bind(null, etapaAtual.id, sessao.id)}>
          <p className="text-sm text-foreground/60">
            Ainda não há assuntos estudados nessa disciplina pra reforçar. Sem problema —
            vamos direto pro estudo de hoje.
          </p>
          {camposDesempenho}
          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Continuar
          </SubmitButton>
        </form>
      );
  }

  if (etapaAtual.tipo === "estudo") {
    const { data: proximoAssunto } = await supabase
      .from("assuntos")
      .select("id, nome, progresso_estudo")
      .eq("disciplina_id", disciplina.id)
      .eq("ja_estudado", false)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle();

    conteudo = proximoAssunto ? (
      <div>
        <p className="text-sm text-foreground/60">Estude esse assunto no seu material (curso, livro, videoaula):</p>
        <p className="mt-2 text-xl font-semibold text-foreground">{proximoAssunto.nome}</p>
        {proximoAssunto.progresso_estudo && (
          <p className="mt-3 text-sm text-foreground/60">
            Você parou em: <span className="font-medium text-foreground">{proximoAssunto.progresso_estudo}</span>.
            Continue a partir daí.
          </p>
        )}

        <form action={concluirEstudo.bind(null, etapaAtual.id, sessao.id, proximoAssunto.id)}>
          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Terminei esse assunto
          </SubmitButton>
        </form>

        <div className="mt-3 rounded-md border border-foreground/10 bg-foreground/3 p-3">
          <p className="text-xs text-foreground/60">
            Não deu tempo de terminar {proximoAssunto.nome}? Sem problema — ele continua aqui e volta a
            aparecer no Estudo na próxima vez que {disciplina.nome} entrar no ciclo.
          </p>
          <form
            action={continuarEstudoDepois.bind(null, etapaAtual.id, sessao.id, proximoAssunto.id)}
            className="mt-2 flex flex-col gap-2 sm:flex-row"
          >
            <input
              name="progresso"
              type="text"
              placeholder="Onde você parou (opcional)"
              className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <SubmitButton
              pendingText="Salvando..."
              className="shrink-0 rounded-md px-4 py-2 text-sm font-medium text-foreground/70 ring-1 ring-foreground/20 hover:text-foreground hover:ring-foreground/40"
            >
              Ainda não terminei
            </SubmitButton>
          </form>
        </div>
      </div>
    ) : (
      <form action={concluirEstudo.bind(null, etapaAtual.id, sessao.id, null)}>
        <p className="text-sm text-foreground/60">
          Você já estudou todos os assuntos cadastrados dessa disciplina — hora de reforçar o
          que já viu.
        </p>
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Continuar
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "descanso") {
    conteudo = (
      <form action={concluirDescanso.bind(null, etapaAtual.id, sessao.id)}>
        <p className="text-sm text-foreground/60">
          Levante, beba água, descanse a vista. Volte em alguns minutos pra continuar.
        </p>
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Continuar
        </SubmitButton>
      </form>
    );
  }

  if (etapaAtual.tipo === "lei_seca") {
    if (disciplina.lei_principal) {
      // "cronograma à parte": lê a lei principal da disciplina de forma
      // contínua, independente do assunto estudado no dia (ver
      // concluirLeiSeca em sessao/actions.ts).
      conteudo = (
        <form
          action={concluirLeiSeca.bind(null, etapaAtual.id, sessao.id, disciplina.id, etapaAtual.assunto_id)}
        >
          <p className="text-sm text-foreground/60">Leia:</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{disciplina.lei_principal}</p>

          <p className="mt-3 text-sm text-foreground/60">
            {disciplina.progresso_lei_seca ? (
              <>
                Você parou em:{" "}
                <span className="font-medium text-foreground">{disciplina.progresso_lei_seca}</span>. Continue a
                partir daí.
              </>
            ) : (
              "Primeira leitura — comece do início."
            )}
          </p>

          <div className="mt-4">
            <label className="block text-xs text-foreground/50">Até onde você leu agora</label>
            <input
              name="progresso"
              type="text"
              placeholder="Ex: Art. 42"
              className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
            <input name="reiniciar" type="checkbox" className="h-4 w-4 rounded border-foreground/30" />
            Terminei de ler tudo — recomeçar do início
          </label>

          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluir
          </SubmitButton>
        </form>
      );
    } else {
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
        <form
          action={concluirLeiSeca.bind(null, etapaAtual.id, sessao.id, disciplina.id, etapaAtual.assunto_id)}
        >
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

          <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
            Concluir
          </SubmitButton>
        </form>
      );
    }
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

        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir
        </SubmitButton>
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
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir
        </SubmitButton>
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
        <div className="mt-4">
          <label className="block text-xs text-foreground/50">Se errou algo, o que vale revisar depois</label>
          <textarea
            name="anotacao"
            rows={2}
            placeholder="Ex: confundi prazo de recurso com o de prescrição"
            className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <SubmitButton className="mt-6 rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90">
          Concluir sessão
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-3 h-1 w-full rounded-full bg-foreground/10">
          <div
            className="h-1 rounded-full bg-gold transition-all"
            style={{ width: `${((etapaIndex + 1) / etapas.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3">
          <TempoAcumulado
            label="Tempo estudado hoje"
            baseSegundos={tempoBaseHojeSegundos}
            etapaAtualAcumulado={acumuladoEtapaAtual}
            iniciadaEmAtual={etapaAtual.iniciada_em}
          />
          <TempoAcumulado
            label="Nesta sessão"
            baseSegundos={tempoBaseSessaoSegundos}
            etapaAtualAcumulado={acumuladoEtapaAtual}
            iniciadaEmAtual={etapaAtual.iniciada_em}
          />
        </div>

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
              tempoAcumuladoSegundos={acumuladoEtapaAtual}
              iniciadaEm={etapaAtual.iniciada_em}
              sugeridoMinutos={
                etapaAtual.minutos_ajustados ??
                (MINUTOS_SUGERIDOS[etapaAtual.tipo] !== undefined
                  ? Math.round(MINUTOS_SUGERIDOS[etapaAtual.tipo] * ajusteTempo)
                  : undefined)
              }
              sugeridoLabel={
                ajusteTempo === 1 && etapaAtual.minutos_ajustados === null
                  ? SUGERIDO_LABEL[etapaAtual.tipo]
                  : undefined
              }
            />
            {etapaAtual.iniciada_em ? (
              <form action={pausarEtapa.bind(null, etapaAtual.id)}>
                <SubmitButton
                  pendingText="Pausando..."
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-foreground/60 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="3" y="2" width="3" height="10" />
                    <rect x="8" y="2" width="3" height="10" />
                  </svg>
                  Pausar
                </SubmitButton>
              </form>
            ) : (
              <form action={retomarEtapa.bind(null, etapaAtual.id)}>
                <SubmitButton
                  pendingText="Retomando..."
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-gold/10 px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-gold/40 hover:bg-gold/20"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M3 2 L12 7 L3 12 Z" />
                  </svg>
                  Continuar de onde parei
                </SubmitButton>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6">{conteudo}</div>
      </div>
    </div>
  );
}
