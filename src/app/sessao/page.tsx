import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  concluirAtivacaoCognitiva,
  concluirEstudo,
  concluirConsolidacao,
  concluirQuestoes,
} from "./actions";

const ETAPA_LABELS: Record<string, string> = {
  ativacao_cognitiva: "Ativação Cognitiva",
  estudo: "Estudo",
  lei_seca: "Lei Seca",
  jurisprudencia: "Jurisprudência",
  exercicios: "Exercícios",
  laboratorio: "Laboratório",
  questoes: "Questões",
};

const CONSOLIDACAO_INSTRUCAO: Record<string, string> = {
  lei_seca: "Leia a lei seca relacionada a esse assunto no seu material.",
  jurisprudencia: "Busque e leia jurisprudência recente sobre esse assunto.",
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
    .select("id, tipo, ordem, concluida, assunto_id")
    .eq("sessao_id", sessao.id)
    .order("ordem", { ascending: true });

  const etapas = (etapasData ?? []) as Etapa[];
  const etapaAtual = etapas.find((e) => !e.concluida);

  if (!disciplina || !etapaAtual) redirect("/painel");

  const etapaIndex = etapas.findIndex((e) => e.id === etapaAtual.id);

  let conteudo: React.ReactNode = null;

  if (etapaAtual.tipo === "ativacao_cognitiva") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("ativacao_modo")
      .eq("id", user.id)
      .single();

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
        <form action={concluirAtivacaoCognitiva.bind(null, etapaAtual.id)}>
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
        <form action={concluirAtivacaoCognitiva.bind(null, etapaAtual.id)}>
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

  if (["lei_seca", "jurisprudencia", "exercicios", "laboratorio"].includes(etapaAtual.tipo)) {
    let nomeAssunto: string | null = null;
    if (etapaAtual.assunto_id) {
      const { data } = await supabase
        .from("assuntos")
        .select("nome")
        .eq("id", etapaAtual.assunto_id)
        .single();
      nomeAssunto = data?.nome ?? null;
    }

    conteudo = (
      <form action={concluirConsolidacao.bind(null, etapaAtual.id)}>
        <p className="text-sm text-foreground/60">{CONSOLIDACAO_INSTRUCAO[etapaAtual.tipo]}</p>
        {nomeAssunto && (
          <p className="mt-2 text-xl font-semibold text-foreground">{nomeAssunto}</p>
        )}
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
    let nomeAssunto: string | null = null;
    if (etapaAtual.assunto_id) {
      const { data } = await supabase
        .from("assuntos")
        .select("nome")
        .eq("id", etapaAtual.assunto_id)
        .single();
      nomeAssunto = data?.nome ?? null;
    }

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
          Resolva questões {nomeAssunto ? `sobre` : "dessa disciplina"} {nomeAssunto && (
            <span className="font-medium text-foreground">{nomeAssunto}</span>
          )}{" "}
          no seu material e registre o resultado:
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
        <div className="mb-10 h-1 w-full rounded-full bg-foreground/10">
          <div
            className="h-1 rounded-full bg-gold transition-all"
            style={{ width: `${((etapaIndex + 1) / etapas.length) * 100}%` }}
          />
        </div>

        <p className="text-sm text-foreground/50">
          {disciplina.nome} · etapa {etapaIndex + 1} de {etapas.length}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">
          {ETAPA_LABELS[etapaAtual.tipo] ?? etapaAtual.tipo}
        </h1>

        <div className="mt-6">{conteudo}</div>
      </div>
    </main>
  );
}
