export const ETAPA_LABELS: Record<string, string> = {
  ativacao_cognitiva: "Ativação Cognitiva",
  estudo: "Estudo",
  descanso: "Descanso",
  lei_seca: "Lei Seca",
  jurisprudencia: "Jurisprudência",
  exercicios: "Exercícios",
  laboratorio: "Laboratório",
  questoes: "Questões",
  revisao_erros: "Revisão de Erros",
};

// Duração sugerida por etapa — método validado do Atlion, não é estimativa.
export const MINUTOS_SUGERIDOS: Record<string, number> = {
  ativacao_cognitiva: 15, // método: 10 a 15 min
  estudo: 50,
  descanso: 10,
  lei_seca: 20,
  jurisprudencia: 20,
  exercicios: 20,
  laboratorio: 20,
  questoes: 20,
  revisao_erros: 10,
};

export const SUGERIDO_LABEL: Partial<Record<string, string>> = {
  ativacao_cognitiva: "10–15 min",
};

// Ajuste de tempo por sessão: multiplicador sobre MINUTOS_SUGERIDOS, pra
// quem tem mais ou menos tempo naquele dia específico. É por sessão, não
// uma preferência salva — o padrão (1) sempre volta na próxima sessão.
export const AJUSTES_TEMPO: { valor: number; label: string }[] = [
  { valor: 0.7, label: "Menos tempo hoje" },
  { valor: 1, label: "Padrão" },
  { valor: 1.3, label: "Mais tempo hoje" },
];

// Piso mínimo por etapa, só pra avisar quando o ajuste manual fica baixo
// demais — não bloqueia nada, a pessoa decide mesmo assim (gerenciável, mas
// o padrão do método continua sendo a referência).
const MINUTOS_MINIMOS: Partial<Record<string, number>> = {
  ativacao_cognitiva: 10,
};

// Duração de referência de uma sessão completa (o pipeline mais longo, o
// jurídico: ativação 15 + estudo 50 + descanso 10 + lei seca 20 +
// jurisprudência 20 + questões 20 = 135 min). A duração real varia com o
// tipo de disciplina que o Motor escolher — isso é só uma régua pra estimar
// quantas sessões inteiras cabem no tempo líquido do aluno, não um valor
// exato por sessão.
export const MINUTOS_SESSAO_REFERENCIA = 135;

// Quantas sessões inteiras (não uma sessão só esticada) cabem no tempo
// líquido diário do aluno — é assim que "horas líquidas por dia" (pergunta
// já feita no onboarding) passa a influenciar o dia, sem esticar a duração
// validada de cada etapa. Sem informação, assume 1 sessão (comportamento
// de sempre).
export function sessoesPrevistasHoje(horasLiquidasDia: number | null | undefined): number {
  if (!horasLiquidasDia || horasLiquidasDia <= 0) return 1;
  return Math.max(1, Math.round((horasLiquidasDia * 60) / MINUTOS_SESSAO_REFERENCIA));
}

export function avisoTempoBaixo(tipo: string, minutos: number): string | null {
  const minimo = MINUTOS_MINIMOS[tipo];

  if (tipo === "ativacao_cognitiva" && minimo !== undefined && minutos < minimo) {
    return "A Ativação Cognitiva é fundamental pra reforçar o que você já estudou — menos de 10 min pode não ser suficiente.";
  }
  if (minimo !== undefined && minutos < minimo) {
    return `Menos que o mínimo recomendado (${minimo} min) pra essa etapa.`;
  }

  const sugerido = MINUTOS_SUGERIDOS[tipo];
  if (sugerido && minutos < sugerido * 0.4) {
    return "Bem menos que o normal — ok pra hoje, mas evite virar hábito.";
  }
  return null;
}
