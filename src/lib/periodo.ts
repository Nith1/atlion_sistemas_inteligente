export const PERIODOS_RAPIDOS = [
  { valor: "hoje", label: "Hoje" },
  { valor: "7d", label: "7 dias" },
  { valor: "30d", label: "30 dias" },
  { valor: "total", label: "Total" },
];

// Datas customizadas (de/até) sempre vencem o período rápido, quando presentes.
export function resolverPeriodo(periodo: string | undefined, de: string | undefined, ate: string | undefined) {
  const fimPadrao = new Date();
  fimPadrao.setHours(23, 59, 59, 999);

  if (de || ate) {
    return {
      inicio: de ? new Date(`${de}T00:00:00`) : null,
      fim: ate ? new Date(`${ate}T23:59:59`) : fimPadrao,
      label: `${de ?? "início"} até ${ate ?? "hoje"}`,
    };
  }

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  if (periodo === "hoje") return { inicio: inicioHoje, fim: fimPadrao, label: "hoje" };
  if (periodo === "7d") {
    const inicio = new Date(inicioHoje);
    inicio.setDate(inicio.getDate() - 6);
    return { inicio, fim: fimPadrao, label: "últimos 7 dias" };
  }
  if (periodo === "30d") {
    const inicio = new Date(inicioHoje);
    inicio.setDate(inicio.getDate() - 29);
    return { inicio, fim: fimPadrao, label: "últimos 30 dias" };
  }
  return { inicio: null, fim: fimPadrao, label: "total" };
}

export function dentroDoPeriodo(dataIso: string | null, inicio: Date | null, fim: Date): boolean {
  if (!dataIso) return false;
  const data = new Date(dataIso);
  if (inicio && data < inicio) return false;
  return data <= fim;
}
