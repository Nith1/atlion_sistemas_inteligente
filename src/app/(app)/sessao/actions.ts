"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LIMITE_CRONOMETRO_SEGUNDOS, segundosDesdeComLimite } from "@/lib/tempo";
import { sessoesPrevistasHoje } from "@/lib/etapas";
import { calcularUrgencia, type Prioridade } from "@/lib/disciplinas";
import { criarPipelineConsolidacao, deveSerConsolidacao } from "@/lib/janela-ativacao";
import { criarPipelineValidacao, decidirConsequenciasSimulado } from "@/lib/simulado";

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

// Reforço de segunda camada contra reenvio (a sessão offline enfileira
// essas mesmas ações e só remove da fila após sucesso confirmado — ver
// src/lib/sessao-offline/fila.ts — mas se a resposta se perder depois do
// servidor já ter aplicado, o client tenta de novo). Sem essa guarda, um
// reenvio duplicaria tempo gasto e, em concluirQuestoes, registros de
// questões.
async function etapaJaConcluida(supabase: SupabaseClient, etapaId: string): Promise<boolean> {
  const { data } = await supabase.from("sessao_etapas").select("concluida").eq("id", etapaId).single();
  return data?.concluida ?? false;
}

// Escolhe a disciplina que está mais "atrasada" (mais tempo sem ser
// estudada, ponderado pela prioridade que a pessoa deu a ela em
// Planejamento) — é assim que o sistema decide sozinho o que estudar hoje,
// sem perguntar ao usuário. Prioridade "normal" em tudo reproduz o
// comportamento original: puro round-robin por tempo sem estudar.
async function escolherDisciplina(supabase: SupabaseClient, userId: string) {
  const { data: disciplinas } = await supabase
    .from("disciplinas")
    .select("id, nome, tipo, prioridade, assuntos_desde_consolidacao, em_validacao")
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

// Quantas sessões esse usuário já concluiu hoje — usado tanto pra decidir se
// uma sessão nova é "continuação" do dia (ganha um Descanso de transição
// antes da próxima Ativação Cognitiva) quanto pra saber se ainda cabe mais
// uma sessão dentro das horas líquidas informadas no onboarding (ver
// sessoesPrevistasHoje em src/lib/etapas.ts).
async function contarSessoesConcluidasHoje(supabase: SupabaseClient, userId: string): Promise<number> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("sessoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "concluida")
    .gte("concluida_em", inicioHoje.toISOString());

  return count ?? 0;
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

type DisciplinaEscolhida = {
  id: string;
  tipo: string;
  assuntos_desde_consolidacao: number;
  em_validacao: boolean;
};

// Cria a sessão + pipeline de etapas pra uma disciplina já escolhida.
// `continuacao` marca que essa sessão emenda em outra concluída mais cedo no
// mesmo dia (ver tentarEncadearProximaSessao) — nesse caso entra um Descanso
// de transição antes da primeira etapa, separando um ciclo do outro (ex:
// ...Questões, Descanso, Ativação Cognitiva...), diferente do Descanso que já
// existe no meio de cada ciclo (depois do Estudo).
async function criarSessaoParaDisciplina(
  supabase: SupabaseClient,
  userId: string,
  disciplina: DisciplinaEscolhida,
  continuacao: boolean
): Promise<string | null> {
  // Enquanto a disciplina estiver em modo de Validação, toda sessão dela é
  // um Simulado — nem chega a checar deveSerConsolidacao (ver
  // src/lib/janela-ativacao.ts, que fica intocado: essa função nunca
  // precisa saber que Validação existe).
  const ehValidacao = disciplina.em_validacao;
  const ehConsolidacao =
    !ehValidacao &&
    (await deveSerConsolidacao(supabase, disciplina.id, disciplina.assuntos_desde_consolidacao));

  const tipo = ehValidacao ? "validacao" : ehConsolidacao ? "consolidacao" : "normal";

  const { data: sessao } = await supabase
    .from("sessoes")
    .insert({ user_id: userId, disciplina_id: disciplina.id, tipo })
    .select("id")
    .single();

  if (!sessao) return null;

  if (ehValidacao) {
    await criarPipelineValidacao(supabase, sessao.id, disciplina.id);
  } else if (ehConsolidacao) {
    await criarPipelineConsolidacao(supabase, sessao.id, disciplina.id, disciplina.assuntos_desde_consolidacao);
  } else {
    const tipos = ETAPAS_POR_TIPO[disciplina.tipo] ?? ETAPAS_POR_TIPO.personalizada;
    await supabase.from("sessao_etapas").insert(tipos.map((t, ordem) => ({ sessao_id: sessao.id, tipo: t, ordem })));
  }

  if (continuacao) {
    const { data: etapasCriadas } = await supabase
      .from("sessao_etapas")
      .select("id, ordem")
      .eq("sessao_id", sessao.id)
      .order("ordem", { ascending: true });

    if (etapasCriadas && etapasCriadas.length > 0) {
      await Promise.all(
        etapasCriadas.map((e) => supabase.from("sessao_etapas").update({ ordem: e.ordem + 1 }).eq("id", e.id))
      );
      await supabase.from("sessao_etapas").insert({ sessao_id: sessao.id, tipo: "descanso", ordem: 0 });
    }
  }

  return sessao.id as string;
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

  const jaEstudouHoje = (await contarSessoesConcluidasHoje(supabase, userId)) > 0;
  return criarSessaoParaDisciplina(supabase, userId, disciplina, jaEstudouHoje);
}

// Chamado ao fechar o ciclo de uma disciplina (fim da etapa Questões) —
// se as horas líquidas do dia (ver sessoesPrevistasHoje em src/lib/etapas.ts)
// ainda comportam mais um ciclo completo hoje, a próxima sessão já é criada e
// tem sua primeira etapa iniciada na hora, emendando no fluxo sem exigir um
// novo "Estudar Agora" — é isso que faz a sessão do dia parecer um ciclo só
// (Ativação, Estudo, Descanso, Lei Seca, Jurisprudência, Questões, Descanso,
// Ativação...) mesmo sendo, por baixo, uma sessão nova por disciplina. Se não
// couber mais nada hoje, não faz nada — o fluxo volta pro Painel como sempre.
async function tentarEncadearProximaSessao(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("horas_liquidas_dia")
    .eq("id", userId)
    .single();

  const concluidasHoje = await contarSessoesConcluidasHoje(supabase, userId);
  if (concluidasHoje >= sessoesPrevistasHoje(profile?.horas_liquidas_dia)) return;

  const disciplina = await escolherDisciplina(supabase, userId);
  if (!disciplina) return;

  const proximaSessaoId = await criarSessaoParaDisciplina(supabase, userId, disciplina, true);
  if (proximaSessaoId) await iniciarProximaEtapa(supabase, proximaSessaoId);
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
  if (await etapaJaConcluida(supabase, etapaId)) return;

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
  if (await etapaJaConcluida(supabase, etapaId)) return;
  await avancarEtapa(supabase, etapaId, sessaoId);
}

export async function concluirEstudo(
  etapaId: string,
  sessaoId: string,
  assuntoId: string | null
) {
  const { supabase } = await requireUser();
  if (await etapaJaConcluida(supabase, etapaId)) return;

  if (assuntoId) {
    const { data: assuntoAntes } = await supabase
      .from("assuntos")
      .select("ja_estudado, disciplina_id")
      .eq("id", assuntoId)
      .single();

    await supabase
      .from("assuntos")
      .update({ ja_estudado: true, ultima_vez_estudado: new Date().toISOString(), progresso_estudo: null })
      .eq("id", assuntoId);

    // Conta pro gatilho da próxima Sessão de Consolidação (ver
    // src/lib/janela-ativacao.ts) só numa transição real ja_estudado
    // false→true — reabrir "Ainda não terminei" depois não conta de novo.
    if (assuntoAntes && !assuntoAntes.ja_estudado) {
      const { data: disciplina } = await supabase
        .from("disciplinas")
        .select("assuntos_desde_consolidacao")
        .eq("id", assuntoAntes.disciplina_id)
        .single();

      await supabase
        .from("disciplinas")
        .update({ assuntos_desde_consolidacao: (disciplina?.assuntos_desde_consolidacao ?? 0) + 1 })
        .eq("id", assuntoAntes.disciplina_id);
    }

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
  if (await etapaJaConcluida(supabase, etapaId)) return;

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
  if (await etapaJaConcluida(supabase, etapaId)) return;

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("leis_principais")
    .eq("id", disciplinaId)
    .single();

  if (disciplina?.leis_principais && disciplina.leis_principais.length > 0) {
    // "cronograma à parte": o progresso é da disciplina, não do assunto —
    // continua de onde parou toda vez que essa disciplina volta no ciclo,
    // independente de qual assunto foi estudado no dia. Não tem como o
    // sistema saber sozinho quando o aluno terminou de ler a lei inteira
    // (é texto livre) — por isso o checkbox "reiniciar" existe.
    const reiniciar = formData.get("reiniciar") === "on";
    const progresso = (formData.get("progresso") as string)?.trim();

    // "Até onde você leu agora" é opcional — deixar em branco significa "não
    // tenho nada novo pra atualizar hoje", não "apague o que eu já tinha
    // salvo". Só grava progresso_lei_seca quando reiniciar foi marcado
    // (reset intencional) ou quando um valor novo foi digitado; sem isso,
    // todo envio em branco apagava silenciosamente o progresso anterior.
    if (reiniciar) {
      await supabase.from("disciplinas").update({ progresso_lei_seca: null }).eq("id", disciplinaId);
    } else if (progresso) {
      await supabase.from("disciplinas").update({ progresso_lei_seca: progresso }).eq("id", disciplinaId);
    }
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
  disciplinaId: string,
  assuntoId: string | null,
  formData: FormData
) {
  const { supabase } = await requireUser();
  if (await etapaJaConcluida(supabase, etapaId)) return;

  const { data: disciplina } = await supabase
    .from("disciplinas")
    .select("jurisprudencias_principais")
    .eq("id", disciplinaId)
    .single();

  if (disciplina?.jurisprudencias_principais && disciplina.jurisprudencias_principais.length > 0) {
    // "cronograma à parte", espelhando lei_principal: o progresso é da
    // disciplina, não do assunto — continua de onde parou toda vez que essa
    // disciplina volta no ciclo, independente de qual assunto foi estudado
    // no dia.
    const reiniciar = formData.get("reiniciar") === "on";
    const progresso = (formData.get("progresso") as string)?.trim();

    if (reiniciar) {
      await supabase.from("disciplinas").update({ progresso_jurisprudencia: null }).eq("id", disciplinaId);
    } else if (progresso) {
      await supabase.from("disciplinas").update({ progresso_jurisprudencia: progresso }).eq("id", disciplinaId);
    }
  } else if (assuntoId) {
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
  if (await etapaJaConcluida(supabase, etapaId)) return;
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
  if (await etapaJaConcluida(supabase, etapaId)) return;

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

  await tentarEncadearProximaSessao(supabase, user.id);

  // Não redireciona aqui: essa action pode ser chamada tanto por um submit
  // normal quanto pela fila de sincronização offline (ver
  // src/lib/sessao-offline/despachar.ts), e só o client sabe o momento
  // certo de navegar — depois de mostrar "sessão concluída" e confirmar que
  // sincronizou. Ver sessao-runtime.tsx. Se uma próxima sessão coube hoje
  // (ver tentarEncadearProximaSessao), o client vai pra /sessao de novo e ela
  // já está pronta; se não, /sessao redireciona sozinho pro Painel.
}

// Etapa própria da Sessão de Consolidação: marca como revisada toda a leva
// de erros pendentes da disciplina (mesmo campo `revisado` que o Caderno de
// Erros usa — ver alternarRevisado em caderno-erros/actions.ts — só que em
// lote pra disciplina inteira em vez de um grupo sessão+assunto só).
export async function concluirRevisaoErros(etapaId: string, sessaoId: string, disciplinaId: string) {
  const { supabase, user } = await requireUser();
  if (await etapaJaConcluida(supabase, etapaId)) return;

  await supabase
    .from("questoes_registro")
    .update({ revisado: true })
    .eq("user_id", user.id)
    .eq("disciplina_id", disciplinaId)
    .eq("acertou", false)
    .eq("revisado", false);

  await avancarEtapa(supabase, etapaId, sessaoId);
}

// Etapa "Questões" de uma Sessão de Consolidação: igual concluirQuestoes,
// mas com certas/erradas por assunto (um por linha de sessao_etapa_assuntos)
// em vez de um assuntoId só — ver bundle.assuntosConsolidacao em page.tsx.
export async function concluirQuestoesConsolidacao(
  etapaId: string,
  sessaoId: string,
  disciplinaId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  if (await etapaJaConcluida(supabase, etapaId)) return;

  const assuntoIds = formData.getAll("assuntoId") as string[];
  const anotacaoErros = (formData.get("anotacao") as string)?.trim() || null;

  const registros = assuntoIds.flatMap((id) => {
    const certas = Math.max(0, Number(formData.get(`certas_${id}`) ?? 0));
    const erradas = Math.max(0, Number(formData.get(`erradas_${id}`) ?? 0));

    return [
      ...Array(certas).fill({ acertou: true, anotacao: null }),
      ...Array(erradas).fill({ acertou: false, anotacao: erradas > 0 ? anotacaoErros : null }),
    ].map(({ acertou, anotacao }: { acertou: boolean; anotacao: string | null }) => ({
      user_id: user.id,
      disciplina_id: disciplinaId,
      assunto_id: id,
      sessao_id: sessaoId,
      acertou,
      anotacao,
    }));
  });

  if (registros.length > 0) {
    await supabase.from("questoes_registro").insert(registros);
  }

  await avancarEtapa(supabase, etapaId, sessaoId, {
    ativacao_anki: formData.has("anki") ? formData.get("anki") === "on" : null,
  });

  const { count: restantes } = await supabase
    .from("assuntos")
    .select("id", { count: "exact", head: true })
    .eq("disciplina_id", disciplinaId)
    .eq("ja_estudado", false);

  // Fecha a janela: a próxima sessão dessa disciplina volta a ser normal,
  // recomeçando a contagem pro gatilho da próxima Consolidação — a menos
  // que não sobre mais nenhum assunto novo, caso em que a disciplina entra
  // em modo de Validação (Simulado por disciplina — ver src/lib/simulado.ts)
  // em vez de voltar a "normal".
  await supabase
    .from("disciplinas")
    .update({ assuntos_desde_consolidacao: 0, em_validacao: (restantes ?? 0) === 0 })
    .eq("id", disciplinaId);

  await supabase
    .from("sessoes")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", sessaoId);

  await tentarEncadearProximaSessao(supabase, user.id);
}

// Etapa "Questões" de uma Sessão de Validação (Simulado por disciplina):
// igual concluirQuestoesConsolidacao, mas cobre TODOS os assuntos recebidos
// (não filtra por tier — ver bundle.assuntosRevisaoGlobal em page.tsx) e, ao
// final, aplica o loop de feedback (ver decidirConsequenciasSimulado em
// src/lib/simulado.ts): desempenho ruim num assunto pode reabrir o Estudo
// dele ou tirar a disciplina de Validação por mais uma Consolidação.
export async function concluirQuestoesValidacao(
  etapaId: string,
  sessaoId: string,
  disciplinaId: string,
  formData: FormData
) {
  const { supabase, user } = await requireUser();
  if (await etapaJaConcluida(supabase, etapaId)) return;

  const assuntoIds = formData.getAll("assuntoId") as string[];
  const anotacaoErros = (formData.get("anotacao") as string)?.trim() || null;

  const porAssunto = assuntoIds.map((id) => ({
    id,
    certas: Math.max(0, Number(formData.get(`certas_${id}`) ?? 0)),
    erradas: Math.max(0, Number(formData.get(`erradas_${id}`) ?? 0)),
  }));

  const registros = porAssunto.flatMap(({ id, certas, erradas }) =>
    [
      ...Array(certas).fill({ acertou: true, anotacao: null }),
      ...Array(erradas).fill({ acertou: false, anotacao: erradas > 0 ? anotacaoErros : null }),
    ].map(({ acertou, anotacao }: { acertou: boolean; anotacao: string | null }) => ({
      user_id: user.id,
      disciplina_id: disciplinaId,
      assunto_id: id,
      sessao_id: sessaoId,
      acertou,
      anotacao,
    }))
  );

  if (registros.length > 0) {
    await supabase.from("questoes_registro").insert(registros);
  }

  // só assuntos com pelo menos 1 questão registrada nesse envio entram na
  // classificação de gravidade — senão um assunto deixado em branco
  // contaria como taxaErro=0 (leve) por engano.
  const resultados = porAssunto
    .filter(({ certas, erradas }) => certas + erradas > 0)
    .map(({ id, certas, erradas }) => ({ assuntoId: id, taxaErro: erradas / (certas + erradas) }));

  const consequencias = decidirConsequenciasSimulado(resultados);

  if (consequencias.assuntosParaReestudar.length > 0) {
    await supabase.from("assuntos").update({ ja_estudado: false }).in("id", consequencias.assuntosParaReestudar);
  }

  if (consequencias.disciplina) {
    await supabase
      .from("disciplinas")
      .update({
        em_validacao: consequencias.disciplina.emValidacao,
        ...(consequencias.disciplina.assuntosDesdeConsolidacao !== undefined
          ? { assuntos_desde_consolidacao: consequencias.disciplina.assuntosDesdeConsolidacao }
          : {}),
      })
      .eq("id", disciplinaId);
  }

  await avancarEtapa(supabase, etapaId, sessaoId, {
    ativacao_anki: formData.has("anki") ? formData.get("anki") === "on" : null,
  });

  await supabase
    .from("sessoes")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", sessaoId);

  await tentarEncadearProximaSessao(supabase, user.id);
}
