// Teto de segurança pro cronômetro de uma etapa: se a pessoa deixar a aba
// aberta e sair (sem pausar nem concluir), o tempo "ao vivo" não pode
// crescer pra sempre — isso inflava o "tempo estudado hoje" quando alguém
// esquecia a etapa rodando por horas. Nenhuma etapa sugerida passa de 50
// min, então 3h de folga é mais que suficiente pra quem realmente demorou.
export const LIMITE_CRONOMETRO_SEGUNDOS = 3 * 60 * 60;

export function segundosDesdeComLimite(iniciadaEmIso: string, agoraMs: number = Date.now()): number {
  const bruto = Math.max(0, Math.round((agoraMs - new Date(iniciadaEmIso).getTime()) / 1000));
  return Math.min(bruto, LIMITE_CRONOMETRO_SEGUNDOS);
}
