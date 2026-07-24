export function formatarDuracao(segundosTotais: number): string {
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.round((segundosTotais % 3600) / 60);
  if (horas === 0) return `${minutos} min`;
  return `${horas}h ${String(minutos).padStart(2, "0")}min`;
}

// Sequência de dias consecutivos com pelo menos uma sessão concluída,
// tolerando não ter estudado ainda hoje (conta a partir de ontem nesse caso).
export function calcularSequenciaDias(datasConcluidas: Date[]): number {
  const diasComEstudo = new Set(
    datasConcluidas.map((data) => {
      const dia = new Date(data);
      dia.setHours(0, 0, 0, 0);
      return dia.getTime();
    })
  );

  const umDiaMs = 24 * 60 * 60 * 1000;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let cursor = hoje.getTime();
  if (!diasComEstudo.has(cursor)) {
    cursor -= umDiaMs;
    if (!diasComEstudo.has(cursor)) return 0;
  }

  let sequencia = 0;
  while (diasComEstudo.has(cursor)) {
    sequencia += 1;
    cursor -= umDiaMs;
  }
  return sequencia;
}
