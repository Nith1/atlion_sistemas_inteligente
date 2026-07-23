import Link from "next/link";
import { PERIODOS_RAPIDOS } from "@/lib/periodo";

type Disciplina = { id: string; nome: string };

// Barra de filtro reutilizada em Estatísticas e Caderno de Erros: botões
// rápidos de período + form com disciplina/datas personalizadas. Tudo via
// GET (sem JS), preservando os parâmetros extras que cada página precisa
// (ex: mostrarRevisados no Caderno de Erros).
export function FiltroPeriodoDisciplina({
  basePath,
  periodo,
  de,
  ate,
  disciplinaParam,
  disciplinas,
  paramsExtras,
}: {
  basePath: string;
  periodo?: string;
  de?: string;
  ate?: string;
  disciplinaParam?: string;
  disciplinas: Disciplina[];
  paramsExtras?: Record<string, string>;
}) {
  const periodoAtivo = de || ate ? null : (periodo ?? "total");

  function hrefPeriodo(valor: string) {
    const params = new URLSearchParams();
    params.set("periodo", valor);
    if (disciplinaParam) params.set("disciplina", disciplinaParam);
    if (paramsExtras) {
      for (const [chave, valorExtra] of Object.entries(paramsExtras)) params.set(chave, valorExtra);
    }
    return `${basePath}?${params.toString()}`;
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {PERIODOS_RAPIDOS.map((p) => (
          <Link
            key={p.valor}
            href={hrefPeriodo(p.valor)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              periodoAtivo === p.valor
                ? "bg-gold text-navy"
                : "text-foreground/60 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form method="GET" action={basePath} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="periodo" value={periodo ?? "total"} />
        {paramsExtras &&
          Object.entries(paramsExtras).map(([chave, valorExtra]) => (
            <input key={chave} type="hidden" name={chave} value={valorExtra} />
          ))}
        <div>
          <label className="block text-xs text-foreground/50">Disciplina</label>
          <select
            name="disciplina"
            defaultValue={disciplinaParam ?? "todas"}
            className="mt-1 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          >
            <option className="bg-background text-foreground" value="todas">
              Todas
            </option>
            {disciplinas.map((d) => (
              <option key={d.id} className="bg-background text-foreground" value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-foreground/50">De</label>
          <input
            type="date"
            name="de"
            defaultValue={de ?? ""}
            className="mt-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-foreground/50">Até</label>
          <input
            type="date"
            name="ate"
            defaultValue={ate ?? ""}
            className="mt-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90"
        >
          Aplicar
        </button>
      </form>
    </>
  );
}
