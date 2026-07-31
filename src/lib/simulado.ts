import type { createClient } from "@/lib/supabase/server";
import { calcularTaxaErroPorAssunto } from "@/lib/metricas";
import { ASSUNTOS_POR_CONSOLIDACAO } from "@/lib/janela-ativacao";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Piso mínimo de peso por assunto no Simulado, mesmo com 0% de erro
// histórico — sem isso um assunto "perfeito" sumiria da revisão, o oposto
// do objetivo de Validação (cobrir tudo, só priorizando o que precisa mais).
export const PESO_SIMULADO_FLOOR = 5;

export type AssuntoComTaxaErro = { id: string; taxaErro: number }; // taxaErro em [0,1]

// pesoBase = piso + 100*taxaErro, normalizado pra somar ~100. Com floor=5,
// taxas históricas de 5%/10%/35%/30% produzem pesos 10/15/40/35 — o formato
// do próprio exemplo usado pra desenhar essa função (os dois piores ficam
// com os maiores pesos).
export function calcularPesosSimulado(
  assuntos: AssuntoComTaxaErro[]
): (AssuntoComTaxaErro & { pesoPercentual: number })[] {
  if (assuntos.length === 0) return [];

  const bases = assuntos.map((a) => ({ ...a, base: PESO_SIMULADO_FLOOR + 100 * a.taxaErro }));
  const somaBase = bases.reduce((soma, a) => soma + a.base, 0);

  return bases.map(({ base, ...a }) => ({
    ...a,
    pesoPercentual: Math.max(1, Math.round((base / somaBase) * 100)),
  }));
}

// Monta o pipeline de uma Sessão de Simulado: mesmas duas etapas de uma
// Consolidação (revisao_erros, questoes), mas sessao_etapa_assuntos cobre
// TODOS os assuntos ja_estudado=true da disciplina, pesados pela taxa de
// erro de todo o histórico de questoes_registro daquele assunto.
export async function criarPipelineValidacao(
  supabase: SupabaseClient,
  sessaoId: string,
  disciplinaId: string
): Promise<void> {
  const { data: etapas } = await supabase
    .from("sessao_etapas")
    .insert([
      { sessao_id: sessaoId, tipo: "revisao_erros", ordem: 0 },
      { sessao_id: sessaoId, tipo: "questoes", ordem: 1 },
    ])
    .select("id, tipo");

  const etapaQuestoes = etapas?.find((etapa) => etapa.tipo === "questoes");
  if (!etapaQuestoes) return;

  const { data: assuntos } = await supabase
    .from("assuntos")
    .select("id")
    .eq("disciplina_id", disciplinaId)
    .eq("ja_estudado", true);

  if (!assuntos || assuntos.length === 0) return;

  const { data: registros } = await supabase
    .from("questoes_registro")
    .select("assunto_id, acertou")
    .eq("disciplina_id", disciplinaId)
    .in(
      "assunto_id",
      assuntos.map((a) => a.id)
    );

  const taxas = calcularTaxaErroPorAssunto(registros ?? []);
  const pesos = calcularPesosSimulado(assuntos.map((a) => ({ id: a.id, taxaErro: taxas.get(a.id) ?? 0 })));

  await supabase
    .from("sessao_etapa_assuntos")
    .insert(pesos.map((p) => ({ etapa_id: etapaQuestoes.id, assunto_id: p.id, peso_percentual: p.pesoPercentual })));
}

// --- Feedback loop pós-Simulado (ver concluirQuestoesValidacao em sessao/actions.ts) ---

export const LIMIAR_ERRO_MODERADO = 0.3; // >= 30% de erro
export const LIMIAR_ERRO_GRAVE = 0.6; // >= 60% de erro

export type Severidade = "leve" | "moderado" | "grave";

export function classificarSeveridade(taxaErro: number): Severidade {
  if (taxaErro >= LIMIAR_ERRO_GRAVE) return "grave";
  if (taxaErro >= LIMIAR_ERRO_MODERADO) return "moderado";
  return "leve";
}

export type ResultadoAssuntoSimulado = { assuntoId: string; taxaErro: number };

export type ConsequenciasSimulado = {
  assuntosParaReestudar: string[]; // ja_estudado -> false, nesses assuntos
  disciplina: { emValidacao: false; assuntosDesdeConsolidacao?: number } | null; // null = tudo leve, nada muda
};

// Decide as consequências estruturais de um Simulado, por assunto.
// Precedência quando o envio mistura severidades: GRAVE sempre vence sobre
// MODERADO — um assunto grave já força um re-estudo de verdade (volta a
// ja_estudado=false); empurrar a disciplina TAMBÉM pra uma Consolidação
// adiaria esse re-estudo à toa, já que Consolidação só revisa assuntos
// ja_estudado=true (o grave recém-rebaixado nem apareceria nela). Por isso:
// havendo qualquer grave, aplica só a resposta do grave; a resposta do
// moderado (assuntos_desde_consolidacao = ASSUNTOS_POR_CONSOLIDACAO) só vale
// quando moderado é a pior severidade do envio.
export function decidirConsequenciasSimulado(resultados: ResultadoAssuntoSimulado[]): ConsequenciasSimulado {
  const classificados = resultados.map((r) => ({ ...r, severidade: classificarSeveridade(r.taxaErro) }));
  const graves = classificados.filter((r) => r.severidade === "grave").map((r) => r.assuntoId);
  const temModerado = classificados.some((r) => r.severidade === "moderado");

  if (graves.length > 0) {
    return { assuntosParaReestudar: graves, disciplina: { emValidacao: false } };
  }
  if (temModerado) {
    return {
      assuntosParaReestudar: [],
      disciplina: { emValidacao: false, assuntosDesdeConsolidacao: ASSUNTOS_POR_CONSOLIDACAO },
    };
  }
  return { assuntosParaReestudar: [], disciplina: null };
}
