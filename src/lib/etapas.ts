export const ETAPA_LABELS: Record<string, string> = {
  ativacao_cognitiva: "Ativação Cognitiva",
  estudo: "Estudo",
  descanso: "Descanso",
  lei_seca: "Lei Seca",
  jurisprudencia: "Jurisprudência",
  exercicios: "Exercícios",
  laboratorio: "Laboratório",
  questoes: "Questões",
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
