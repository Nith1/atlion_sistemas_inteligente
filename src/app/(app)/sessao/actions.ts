"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CRONOMETRO_SEGUNDOS, segundosDesdeComLimite } from "@/lib/tempo";
import { calcularUrgencia, type Prioridade } from "@/lib/disciplinas";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Ordem das etapas de cada tipo de disciplina, conforme o vision.md:
// toda sessão começa com Ativação Cognitiva e Estudo, e termina com Questões;
// o meio (consolidação) muda de acordo com a natureza da disciplina.
// "exercícios" foi removido por ser redundante com "questões" — as duas
// etapas serviam pro mesmo propósito (praticar com questões do assunto).
const ETAPAS_POR_TIPO: Record<string, string[]> = {
  juridica: ["ativacao_cognitiva", "estudo", "descanso", "lei_seca", "jurisprudencia", "questoes"],
  exatas: ["ativacao_cognitiva", "estudo", "descanso", "questoes"],
  informatica: ["ativacao_cognitiva", "estudo", "descanso", "laboratorio", "questoes"],
  humanas: ["ativacao_cognitiva", "estudo", "descanso", "questoes"],
  idiomas: ["ativacao_cognitiva", "estudo", "descanso", "questoes"],
  personalizada: ["ativacao_cognitiva", "estudo", "descanso", "questoes"],
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Escolhe a disciplina que está mais "atrasada" (mais tempo sem ser
// estudada, ponderado pela prioridade que a pessoa deu a ela em
// Planejamento) — é assim que o sistema decide sozinho o que estudar hoje,
// sem perguntar ao usuário. Prioridade "normal" em tudo reproduz o
// comportamento original: puro round-robin por tempo sem estudar.
async function escolherDisciplina(supabase: SupabaseClient, userId: string) {
  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome, tipo, prioridade")
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

  const agora = new Date();
  return [...disciplinas].sort((a, b) => {
    const urgenciaA = calcularUrgencia(ultimaSessao.get(a.id) ?? null, a.prioridade as Prioridade, agora);
    const urgenciaB = calcularUrgencia(ultimaSessao.get(b.id) ?? null, b.prioridade as Prioridade, agora);
    return urgenciaB - urgenciaA;
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
    const decorrido = segundosDesdeComLimite(etapa.iniciada_em);
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

// Se a etapa atual ficou "iniciada" por mais tempo que o teto de segurança do
// cronômetro (pessoa fechou a aba, voltou dias depois...), acumula o que já
// rodou e reinicia o relógio a partir de agora — sem isso, quem retomasse uma
// sessão abandonada via "Estudar Agora" via o tempo travado no teto (180:00)
// pra sempre, mesmo sem ter feito nada ainda na volta.
async function retomarEtapaSeAbandonada(supabase: SupabaseClient, sessaoId: string) {
  const { data: atual } = await supabase
    .from("sessao_etapas")
    .select("id, iniciada_em, tempo_acumulado_segundos")
    .eq("sessao_id", sessaoId)
    .eq("concluida", false)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!atual?.iniciada_em) return;

  const decorrido = segundosDesdeComLimite(atual.iniciada_em);
  if (decorrido < LIMITE_CRONOMETRO_SEGUNDOS) return;

  await supabase
    .from("sessao_etapas")
    .update({
      tempo_acumulado_segundos: (atual.tempo_acumulado_segundos ?? 0) + decorrido,
      iniciada_em: new Date().toISOString(),
    })
    .eq("id", atual.id);
}

// Garante que existe uma sessão em andamento pro usuário (cria uma nova se
// não houver), sem redirecionar — usado tanto pelo botão "Estudar Agora"
// quanto pelo fim do onboarding, que precisam de comportamentos diferentes
// depois de garantir a sessão.
//
// Importante: NÃO liga o cronômetro da primeira etapa aqui. O onboarding
// chama essa função minutos antes da pessoa realmente entrar em /sessao (só
// pra ter a preview pronta no Painel/Dashboard) — se o relógio começasse a
// contar aqui, a animação de "Preparando sua metodologia..." e o tempo
// olhando o Painel já apareceriam como tempo estudado. Quem liga o
// cronômetro de verdade é iniciarSessao(), no momento em que a pessoa
// efetivamente vai pra tela de estudo.
export async function garantirSessaoEmAndamento(supabase: SupabaseClient, userId: string) {
  const { data: existente } = await supabase
    .from("sessoes")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "em_andamento")
    .maybeSingle();

  if (existente) {
    await retomarEtapaSeAbandonada(supabase, existente.id);
    return existente.id as string;
  }

  const disciplina = await escolherDisciplina(supabase, userId);
  if (!disciplina) return null;

  const { data: sessao } = await supabase
    .from("sessoes")
    .insert({ user_id: userId, disciplina_id: disciplina.id })
    .select("id")
    .single();

  if (sessao) {
    const tipos = ETAPAS_POR_TIPO[disciplina.tipo] ?? ETAPAS_POR_TIPO.personalizada;
    await supabase.from("sessao_etapas").insert(
      tipos.map((tipo, ordem) => ({ sessao_id: sessao.id, tipo, ordem }))
    );
  }

  return sessao?.id ?? null;
}

const AJUSTES_TEMPO_VALIDOS = [0.7, 1, 1.3];

// Ajusta o multiplicador de tempo da sessão atual (ver 0009_ajuste_tempo_sessao.sql).
// Não é uma preferência — é só pra sessão de hoje; a próxima já volta pro
// padrão sozinha.
export async function ajustarTempoSessao(sessaoId: string, multiplicador: number) {
  const { supabase } = await requireUser();

  if (!AJUSTES_TEMPO_VALIDOS.includes(multiplicador)) return;

  await supabase.from("sessoes").update({ ajuste_tempo: multiplicador }).eq("id", sessaoId);
  // escolher um preset limpa ajustes manuais por etapa — senão um valor
  // digitado antes ficaria "grudado", competindo com o multiplicador novo
  await supabase.from("sessao_etapas").update({ minutos_ajustados: null }).eq("sessao_id", sessaoId);

  revalidatePath("/painel");
  revalidatePath("/sessao");
}

// Ajuste manual do tempo de uma etapa específica (ver 0010_minutos_ajustados_etapa.sql)
// — sobrepõe o cálculo automático só pra ela, dentro da sessão de hoje.
export async function ajustarMinutosEtapa(etapaId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const minutos = Math.round(Number(formData.get("minutos")));
  if (!Number.isFinite(minutos) || minutos < 1) return;

  await supabase.from("sessao_etapas").update({ minutos_ajustados: minutos }).eq("id", etapaId);

  revalidatePath("/painel");
  revalidatePath("/sessao");
}

export async function iniciarSessao() {
  const { supabase, user } = await requireUser();

  const sessaoId = await garantirSessaoEmAndamento(supabase, user.id);
  if (!sessaoId) redirect("/planejamento");

  // é aqui, e só aqui, que o cronômetro da etapa atual liga — no momento em
  // que a pessoa efetivamente está indo pra tela de estudo. Se a etapa já
  // estava em andamento, iniciarProximaEtapa não faz nada (idempotente).
  await iniciarProximaEtapa(supabase, sessaoId);

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

  const decorridoAgora = etapa?.iniciada_em ? segundosDesdeComLimite(etapa.iniciada_em) : 0;
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
      .update({ ja_estudado: true, ultima_vez_estudado: new Date().toISOString(), progresso_estudo: null })
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

// Quando o assunto não coube inteiro numa etapa de Estudo só (ex: "Poder
// Constituinte" é longo demais): não marca ja_estudado — a mesma consulta que
// escolhe "o próximo assunto" no Estudo (ja_estudado = false, menor ordem)
// volta a pegar esse aqui na próxima vez que a disciplina passar pelo
// Estudo, exatamente de onde parou. Sem precisar duplicar o assunto em
// "parte 1 / parte 2" — o sistema decide sozinho que ainda não terminou.
export async function continuarEstudoDepois(
  etapaId: string,
  sessaoId: string,
  assuntoId: string | null,
  formData: FormData
) {
  const { supabase } = await requireUser();

  if (assuntoId) {
    const progresso = (formData.get("progresso") as string)?.trim();

    await supabase
      .from("assuntos")
      .update({ progresso_estudo: progresso || null })
      .eq("id", assuntoId);

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
  disciplinaId: string,
  assuntoId: string | null,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("lei_principal")
    .eq("id", disciplinaId)
    .single();

  if (disciplina?.lei_principal) {
    // "cronograma à parte": o progresso é da disciplina, não do assunto —
    // continua de onde parou toda vez que essa disciplina volta no ciclo,
    // independente de qual assunto foi estudado no dia. Não tem como o
    // sistema saber sozinho quando o aluno terminou de ler a lei inteira
    // (é texto livre) — por isso o checkbox "reiniciar" existe.
    const reiniciar = formData.get("reiniciar") === "on";
    const progresso = (formData.get("progresso") as string)?.trim();

    await supabase
      .from("disciplinas")
      .update({ progresso_lei_seca: reiniciar ? null : progresso || null })
      .eq("id", disciplinaId);
  } else if (assuntoId) {
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
  const anotacaoErros = erradas > 0 ? (formData.get("anotacao") as string)?.trim() || null : null;

  const registros = [
    ...Array(certas).fill({ acertou: true, anotacao: null }),
    ...Array(erradas).fill({ acertou: false, anotacao: anotacaoErros }),
  ].map(({ acertou, anotacao }: { acertou: boolean; anotacao: string | null }) => ({
    user_id: user.id,
    disciplina_id: disciplinaId,
    assunto_id: assuntoId,
    sessao_id: sessaoId,
    acertou,
    anotacao,
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
