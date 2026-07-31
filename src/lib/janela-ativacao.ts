import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Teto da janela móvel de Ativação Cognitiva (assuntos mais recentes,
// ordenados por `ordem` desc entre os já estudados — ver sessao/page.tsx).
export const JANELA_ATIVACAO_TAMANHO = 3;

// A cada N assuntos novos introduzidos numa disciplina, a próxima sessão
// dela vira uma Sessão de Consolidação em vez de normal.
export const ASSUNTOS_POR_CONSOLIDACAO = 4;

export type Peso = "alta" | "media" | "baixa";

// Recebe assuntos já ordenados do mais recente pro mais antigo (ordem desc)
// e etiqueta cada um com sua camada de recência pra uma Sessão de
// Consolidação: os primeiros `blocoAlta` (o bloco introduzido desde a última
// consolidação) são "alta", os próximos JANELA_ATIVACAO_TAMANHO são "media",
// o resto é "baixa". Sem consolidação anterior (blocoAlta cobre tudo),
// degrada sozinho pra "tudo é alta" — sem precisar de caso especial.
export function distribuirTiers<T extends { id: string }>(
  assuntosMaisRecentesPrimeiro: T[],
  blocoAlta: number
): (T & { peso: Peso })[] {
  return assuntosMaisRecentesPrimeiro.map((assunto, indice) => ({
    ...assunto,
    peso:
      indice < blocoAlta
        ? "alta"
        : indice < blocoAlta + JANELA_ATIVACAO_TAMANHO
          ? "media"
          : "baixa",
  }));
}

// Decide se a PRÓXIMA sessão dessa disciplina deve ser uma Consolidação.
// Gatilho principal: o contador bateu ASSUNTOS_POR_CONSOLIDACAO. Gatilho
// secundário: não sobra assunto novo pra introduzir — sem isso, uma
// disciplina com menos de ASSUNTOS_POR_CONSOLIDACAO assuntos restantes
// ficaria presa girando sessões normais vazias pra sempre, sem nunca fechar
// com uma revisão global.
//
// O gatilho secundário SEMPRE roda quando o principal não bateu — mesmo com
// o contador em 0. Um contador zerado não garante que sobra conteúdo: além
// do caso normal (disciplina recém-criada), ele também fica em 0 pra
// qualquer disciplina cujos assuntos viraram ja_estudado=true sem passar
// pela transição que o incrementa (ex: marcados manualmente em Planejamento
// via alternarEstudado, ou já estavam todos estudados antes dessa coluna
// existir — a migration nasceu com o default 0 pra todo mundo). Sem essa
// checagem incondicional, essas disciplinas ficam presas pra sempre no
// fallback "você já estudou tudo" da etapa Estudo, iguais ao bug original
// da Fase 1 que essa função já existe pra fechar.
export async function deveSerConsolidacao(
  supabase: SupabaseClient,
  disciplinaId: string,
  assuntosDesdeConsolidacao: number
): Promise<boolean> {
  if (assuntosDesdeConsolidacao >= ASSUNTOS_POR_CONSOLIDACAO) return true;

  const { count } = await supabase
    .from("assuntos")
    .select("id", { count: "exact", head: true })
    .eq("disciplina_id", disciplinaId)
    .eq("ja_estudado", false);

  return (count ?? 0) === 0;
}

// Monta o pipeline de uma Sessão de Consolidação: insere as duas etapas
// (revisao_erros, questoes) e povoa sessao_etapa_assuntos com os pesos da
// etapa de questões, a partir de todo o histórico de ja_estudado=true da
// disciplina, ordenado do mais recente pro mais antigo.
export async function criarPipelineConsolidacao(
  supabase: SupabaseClient,
  sessaoId: string,
  disciplinaId: string,
  assuntosDesdeConsolidacao: number
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

  const { data: assuntosDesc } = await supabase
    .from("assuntos")
    .select("id")
    .eq("disciplina_id", disciplinaId)
    .eq("ja_estudado", true)
    .order("ordem", { ascending: false });

  const tiers = distribuirTiers(assuntosDesc ?? [], assuntosDesdeConsolidacao);
  if (tiers.length > 0) {
    await supabase
      .from("sessao_etapa_assuntos")
      .insert(tiers.map((tier) => ({ etapa_id: etapaQuestoes.id, assunto_id: tier.id, peso: tier.peso })));
  }
}
