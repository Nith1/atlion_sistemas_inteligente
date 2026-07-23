"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Ordem das etapas de cada tipo de disciplina, conforme o vision.md:
// toda sessão começa com Ativação Cognitiva e Estudo, e termina com Questões;
// o meio (consolidação) muda de acordo com a natureza da disciplina.
const ETAPAS_POR_TIPO: Record<string, string[]> = {
  juridica: ["ativacao_cognitiva", "estudo", "descanso", "lei_seca", "jurisprudencia", "questoes"],
  exatas: ["ativacao_cognitiva", "estudo", "descanso", "exercicios", "questoes"],
  informatica: ["ativacao_cognitiva", "estudo", "descanso", "laboratorio", "questoes"],
  humanas: ["ativacao_cognitiva", "estudo", "descanso", "exercicios", "questoes"],
  idiomas: ["ativacao_cognitiva", "estudo", "descanso", "exercicios", "questoes"],
  personalizada: ["ativacao_cognitiva", "estudo", "descanso", "exercicios", "questoes"],
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

// Marca o início (cronômetro) da próxima etapa não concluída da sessão, se
// ainda não tiver começado — é o que faz o relógio da tela seguinte já valer
// a partir do momento em que ela vira "a etapa atual".
async function iniciarProximaEtapa(supabase: SupabaseClient, sessaoId: string) {
  const { data: proxima } = await supabase
    .from("sessao_etapas")
    .select("id, iniciada_em")
    .eq("sessao_id", sessaoId)
    .eq("concluida", false)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (proxima && !proxima.iniciada_em) {
    await supabase
      .from("sessao_etapas")
      .update({ iniciada_em: new Date().toISOString() })
      .eq("id", proxima.id);
  }
}

// Pausa o cronômetro da etapa atual: soma o que já correu ao acumulado e
// zera o "início" (deixa de contar até a pessoa retomar).
export async function pausarEtapa(etapaId: string) {
  const { supabase } = await requireUser();

  const { data: etapa } = await supabase
    .from("sessao_etapas")
    .select("iniciada_em, tempo_acumulado_segundos")
    .eq("id", etapaId)
    .single();

  if (etapa?.iniciada_em) {
    const decorrido = Math.max(0, Math.round((Date.now() - new Date(etapa.iniciada_em).getTime()) / 1000));
    await supabase
      .from("sessao_etapas")
      .update({
        tempo_acumulado_segundos: (etapa.tempo_acumulado_segundos ?? 0) + decorrido,
        iniciada_em: null,
        pausada: true,
      })
      .eq("id", etapaId);
  }

  revalidatePath("/sessao");
}

// Retoma a etapa pausada: volta a contar a partir de agora.
export async function retomarEtapa(etapaId: string) {
  const { supabase } = await requireUser();

  await supabase
    .from("sessao_etapas")
    .update({ iniciada_em: new Date().toISOString(), pausada: false })
    .eq("id", etapaId);

  revalidatePath("/sessao");
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
      await iniciarProximaEtapa(supabase, sessao.id);
    }
  }

  redirect("/sessao");
}

// Fecha a etapa atual (marca concluída, grava quanto tempo levou de verdade)
// e liga o cronômetro da próxima.
async function avancarEtapa(
  supabase: SupabaseClient,
  etapaId: string,
  sessaoId: string,
  extras?: Record<string, unknown>
) {
  const { data: etapa } = await supabase
    .from("sessao_etapas")
    .select("iniciada_em, tempo_acumulado_segundos")
    .eq("id", etapaId)
    .single();

  const decorridoAgora = etapa?.iniciada_em
    ? Math.max(0, Math.round((Date.now() - new Date(etapa.iniciada_em).getTime()) / 1000))
    : 0;
  const tempoGastoSegundos = (etapa?.tempo_acumulado_segundos ?? 0) + decorridoAgora;

  await supabase
    .from("sessao_etapas")
    .update({
      concluida: true,
      concluida_em: new Date().toISOString(),
      tempo_gasto_segundos: tempoGastoSegundos,
      ...extras,
    })
    .eq("id", etapaId);

  await iniciarProximaEtapa(supabase, sessaoId);
  revalidatePath("/sessao");
}

export async function concluirAtivacaoCognitiva(
  etapaId: string,
  sessaoId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const assuntoIds = formData.getAll("assuntoId") as string[];

  if (assuntoIds.length > 0) {
    await supabase
      .from("assuntos")
      .update({ ultima_vez_estudado: new Date().toISOString() })
      .in("id", assuntoIds);
  }

  await avancarEtapa(supabase, etapaId, sessaoId, {
    ativacao_certas: formData.has("certas") ? Math.max(0, Number(formData.get("certas") ?? 0)) : null,
    ativacao_erradas: formData.has("erradas") ? Math.max(0, Number(formData.get("erradas") ?? 0)) : null,
    ativacao_anki: formData.has("anki") ? formData.get("anki") === "on" : null,
  });
}

export async function concluirDescanso(etapaId: string, sessaoId: string) {
  const { supabase } = await requireUser();
  await avancarEtapa(supabase, etapaId, sessaoId);
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

  await avancarEtapa(supabase, etapaId, sessaoId, { assunto_id: assuntoId });
}

export async function concluirLeiSeca(
  etapaId: string,
  sessaoId: string,
  assuntoId: string | null,
  formData: FormData
) {
  const { supabase } = await requireUser();

  if (assuntoId) {
    const leiReferencia = (formData.get("leiReferencia") as string)?.trim();
    const progresso = (formData.get("progresso") as string)?.trim();

    await supabase
      .from("assuntos")
      .update({
        ...(leiReferencia ? { lei_referencia: leiReferencia } : {}),
        ...(progresso ? { progresso_lei_seca: progresso } : {}),
      })
      .eq("id", assuntoId);
  }

  await avancarEtapa(supabase, etapaId, sessaoId);
}

export async function concluirJurisprudencia(
  etapaId: string,
  sessaoId: string,
  assuntoId: string | null,
  formData: FormData
) {
  const { supabase } = await requireUser();

  if (assuntoId) {
    const referencia = (formData.get("referencia") as string)?.trim();
    const progresso = (formData.get("progresso") as string)?.trim();

    await supabase
      .from("assuntos")
      .update({
        ...(referencia ? { jurisprudencia_referencia: referencia } : {}),
        ...(progresso ? { progresso_jurisprudencia: progresso } : {}),
      })
      .eq("id", assuntoId);
  }

  await avancarEtapa(supabase, etapaId, sessaoId);
}

export async function concluirConsolidacao(etapaId: string, sessaoId: string) {
  const { supabase } = await requireUser();
  await avancarEtapa(supabase, etapaId, sessaoId);
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

  await avancarEtapa(supabase, etapaId, sessaoId, { assunto_id: assuntoId });

  await supabase
    .from("sessoes")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", sessaoId);

  redirect("/painel");
}
