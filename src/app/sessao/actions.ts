"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Ordem das etapas de cada tipo de disciplina, conforme o vision.md:
// toda sessão começa com Ativação Cognitiva e Estudo, e termina com Questões;
// o meio (consolidação) muda de acordo com a natureza da disciplina.
const ETAPAS_POR_TIPO: Record<string, string[]> = {
  juridica: ["ativacao_cognitiva", "estudo", "lei_seca", "jurisprudencia", "questoes"],
  exatas: ["ativacao_cognitiva", "estudo", "exercicios", "questoes"],
  informatica: ["ativacao_cognitiva", "estudo", "laboratorio", "questoes"],
  humanas: ["ativacao_cognitiva", "estudo", "exercicios", "questoes"],
  idiomas: ["ativacao_cognitiva", "estudo", "exercicios", "questoes"],
  personalizada: ["ativacao_cognitiva", "estudo", "exercicios", "questoes"],
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Escolhe a disciplina que faz mais tempo que não é estudada (ou nunca foi) —
// é assim que o sistema decide sozinho o que estudar hoje, sem perguntar ao usuário.
async function escolherDisciplina(supabase: SupabaseClient, userId: string) {
  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome, tipo")
    .eq("user_id", userId)
    .eq("ativa", true)
    .order("ordem", { ascending: true });

  if (!disciplinas || disciplinas.length === 0) return null;

  const { data: concluidas } = await supabase
    .from("sessoes")
    .select("disciplina_id, concluida_em")
    .eq("user_id", userId)
    .eq("status", "concluida")
    .order("concluida_em", { ascending: false });

  const ultimaSessao = new Map<string, string>();
  for (const s of concluidas ?? []) {
    if (!ultimaSessao.has(s.disciplina_id)) {
      ultimaSessao.set(s.disciplina_id, s.concluida_em as string);
    }
  }

  return [...disciplinas].sort((a, b) => {
    const dataA = ultimaSessao.get(a.id);
    const dataB = ultimaSessao.get(b.id);
    if (!dataA && !dataB) return 0;
    if (!dataA) return -1;
    if (!dataB) return 1;
    return new Date(dataA).getTime() - new Date(dataB).getTime();
  })[0];
}

export async function iniciarSessao() {
  const { supabase, user } = await requireUser();

  const { data: existente } = await supabase
    .from("sessoes")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (!existente) {
    const disciplina = await escolherDisciplina(supabase, user.id);
    if (!disciplina) redirect("/planejamento");

    const { data: sessao } = await supabase
      .from("sessoes")
      .insert({ user_id: user.id, disciplina_id: disciplina.id })
      .select("id")
      .single();

    if (sessao) {
      const tipos = ETAPAS_POR_TIPO[disciplina.tipo] ?? ETAPAS_POR_TIPO.personalizada;
      await supabase.from("sessao_etapas").insert(
        tipos.map((tipo, ordem) => ({ sessao_id: sessao.id, tipo, ordem }))
      );
    }
  }

  redirect("/sessao");
}

async function avancarEtapa(
  supabase: SupabaseClient,
  etapaId: string,
  assuntoId?: string | null
) {
  await supabase
    .from("sessao_etapas")
    .update({
      concluida: true,
      concluida_em: new Date().toISOString(),
      ...(assuntoId !== undefined ? { assunto_id: assuntoId } : {}),
    })
    .eq("id", etapaId);

  revalidatePath("/sessao");
}

export async function concluirAtivacaoCognitiva(etapaId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const assuntoIds = formData.getAll("assuntoId") as string[];

  if (assuntoIds.length > 0) {
    await supabase
      .from("assuntos")
      .update({ ultima_vez_estudado: new Date().toISOString() })
      .in("id", assuntoIds);
  }

  await avancarEtapa(supabase, etapaId);
}

export async function concluirEstudo(
  etapaId: string,
  sessaoId: string,
  assuntoId: string | null
) {
  const { supabase } = await requireUser();

  if (assuntoId) {
    await supabase
      .from("assuntos")
      .update({ ja_estudado: true, ultima_vez_estudado: new Date().toISOString() })
      .eq("id", assuntoId);

    // propaga o assunto estudado pras próximas etapas dessa sessão (lei seca,
    // exercícios, questões...), que ainda não foram concluídas
    await supabase
      .from("sessao_etapas")
      .update({ assunto_id: assuntoId })
      .eq("sessao_id", sessaoId)
      .neq("tipo", "ativacao_cognitiva")
      .eq("concluida", false);
  }

  await avancarEtapa(supabase, etapaId, assuntoId);
}

export async function concluirConsolidacao(etapaId: string) {
  const { supabase } = await requireUser();
  await avancarEtapa(supabase, etapaId);
}

export async function concluirQuestoes(
  etapaId: string,
  sessaoId: string,
  disciplinaId: string,
  assuntoId: string | null,
  formData: FormData
) {
  const { supabase, user } = await requireUser();

  const certas = Math.max(0, Number(formData.get("certas") ?? 0));
  const erradas = Math.max(0, Number(formData.get("erradas") ?? 0));

  const registros = [
    ...Array(certas).fill(true),
    ...Array(erradas).fill(false),
  ].map((acertou: boolean) => ({
    user_id: user.id,
    disciplina_id: disciplinaId,
    assunto_id: assuntoId,
    sessao_id: sessaoId,
    acertou,
  }));

  if (registros.length > 0) {
    await supabase.from("questoes_registro").insert(registros);
  }

  await avancarEtapa(supabase, etapaId, assuntoId);

  await supabase
    .from("sessoes")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", sessaoId);

  redirect("/painel");
}
