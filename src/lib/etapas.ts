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

// Piso mínimo por etapa, só pra avisar quando o ajuste manual fica baixo
// demais — não bloqueia nada, a pessoa decide mesmo assim (gerenciável, mas
// o padrão do método continua sendo a referência).
const MINUTOS_MINIMOS: Partial<Record<string, number>> = {
  ativacao_cognitiva: 10,
};

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
