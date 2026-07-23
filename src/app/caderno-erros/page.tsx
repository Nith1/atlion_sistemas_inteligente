import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { alternarRevisado } from "./actions";
import { resolverPeriodo, dentroDoPeriodo } from "@/lib/periodo";
import { FiltroPeriodoDisciplina } from "@/components/filtro-periodo-disciplina";

type Registro = {
  id: string;
  sessao_id: string;
  assunto_id: string | null;
  disciplina_id: string;
  anotacao: string | null;
  revisado: boolean;
  created_at: string;
};

type Bloco = {
  chave: string;
  sessaoId: string;
  assuntoId: string | null;
  disciplinaNome: string;
  assuntoNome: string | null;
  anotacao: string | null;
  revisado: boolean;
  quantidade: number;
  criadaEm: string;
};

function agruparPorSessaoEAssunto(
  registros: Registro[],
  disciplinaNomes: Map<string, string>,
  assuntoNomes: Map<string, string>
): Bloco[] {
  const blocos = new Map<string, Bloco>();

  for (const registro of registros) {
    const chave = `${registro.sessao_id}:${registro.assunto_id ?? "sem-assunto"}`;
    const existente = blocos.get(chave);

    if (existente) {
      existente.quantidade += 1;
      existente.anotacao = existente.anotacao ?? registro.anotacao;
    } else {
      blocos.set(chave, {
        chave,
        sessaoId: registro.sessao_id,
        assuntoId: registro.assunto_id,
        disciplinaNome: disciplinaNomes.get(registro.disciplina_id) ?? "Disciplina",
        assuntoNome: registro.assunto_id ? assuntoNomes.get(registro.assunto_id) ?? null : null,
        anotacao: registro.anotacao,
        revisado: registro.revisado,
        quantidade: 1,
        criadaEm: registro.created_at,
      });
    }
  }

  return [...blocos.values()].sort((a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime());
}

export default async function CadernoErrosPage({
  searchParams,
}: {
  searchParams: Promise<{
    mostrarRevisados?: string;
    periodo?: string;
    de?: string;
    ate?: string;
    disciplina?: string;
  }>;
}) {
  const { mostrarRevisados, periodo, de, ate, disciplina: disciplinaParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: disciplinasAtivasData } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .eq("user_id", user.id)
    .eq("ativa", true)
    .order("ordem", { ascending: true });
  const disciplinasAtivas = disciplinasAtivasData ?? [];

  const { data: registrosData } = await supabase
    .from("questoes_registro")
    .select("id, sessao_id, assunto_id, disciplina_id, anotacao, revisado, created_at")
    .eq("user_id", user.id)
    .eq("acertou", false)
    .order("created_at", { ascending: false });

  const registrosTodos = (registrosData ?? []) as Registro[];

  const { inicio, fim, label: labelPeriodo } = resolverPeriodo(periodo, de, ate);
  const disciplinaAtiva = disciplinaParam && disciplinaParam !== "todas" ? disciplinaParam : null;
  const nomeDisciplinaAtiva = disciplinaAtiva
    ? disciplinasAtivas.find((d) => d.id === disciplinaAtiva)?.nome
    : null;

  const registros = registrosTodos.filter((r) => {
    if (disciplinaAtiva && r.disciplina_id !== disciplinaAtiva) return false;
    return dentroDoPeriodo(r.created_at, inicio, fim);
  });

  const disciplinaIds = [...new Set(registros.map((r) => r.disciplina_id))];
  const assuntoIds = [...new Set(registros.map((r) => r.assunto_id).filter((id): id is string => !!id))];

  const [{ data: disciplinasData }, { data: assuntosData }] = await Promise.all([
    disciplinaIds.length > 0
      ? supabase.from("disciplinas").select("id, nome").in("id", disciplinaIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    assuntoIds.length > 0
      ? supabase.from("assuntos").select("id, nome").in("id", assuntoIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  const disciplinaNomes = new Map((disciplinasData ?? []).map((d) => [d.id, d.nome]));
  const assuntoNomes = new Map((assuntosData ?? []).map((a) => [a.id, a.nome]));

  const blocosTodos = agruparPorSessaoEAssunto(registros, disciplinaNomes, assuntoNomes);
  const mostrarTodos = mostrarRevisados === "1";
  const blocos = mostrarTodos ? blocosTodos : blocosTodos.filter((b) => !b.revisado);
  const totalRevisados = blocosTodos.filter((b) => b.revisado).length;

  function hrefMostrarRevisados(mostrar: boolean) {
    const params = new URLSearchParams();
    if (periodo) params.set("periodo", periodo);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    if (disciplinaParam) params.set("disciplina", disciplinaParam);
    if (mostrar) params.set("mostrarRevisados", "1");
    const qs = params.toString();
    return `/caderno-erros${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/50 hover:text-foreground">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Caderno de Erros</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Toda questão que você errou numa sessão cai aqui, agrupada por assunto. Mostrando: {labelPeriodo} ·{" "}
        {nomeDisciplinaAtiva ?? "todas as disciplinas"}
      </p>

      <FiltroPeriodoDisciplina
        basePath="/caderno-erros"
        periodo={periodo}
        de={de}
        ate={ate}
        disciplinaParam={disciplinaParam}
        disciplinas={disciplinasAtivas}
        paramsExtras={mostrarTodos ? { mostrarRevisados: "1" } : undefined}
      />

      {totalRevisados > 0 && (
        <Link
          href={hrefMostrarRevisados(!mostrarTodos)}
          className="mt-4 inline-block text-xs text-foreground/50 underline underline-offset-4 hover:text-foreground"
        >
          {mostrarTodos ? "Ocultar revisados" : `Ver também os ${totalRevisados} já revisados`}
        </Link>
      )}

      {blocos.length === 0 ? (
        <p className="mt-10 text-sm text-foreground/50">
          {mostrarTodos ? "Nada por aqui ainda." : "Nenhum erro pendente de revisão."}
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {blocos.map((bloco) => (
            <li
              key={bloco.chave}
              className={`rounded-md border border-foreground/10 bg-foreground/3 p-4 ${
                bloco.revisado ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-foreground/50">
                    {bloco.disciplinaNome}
                    {bloco.assuntoNome ? ` · ${bloco.assuntoNome}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Errou {bloco.quantidade} {bloco.quantidade === 1 ? "questão" : "questões"}
                  </p>
                  {bloco.anotacao && (
                    <p className="mt-2 text-sm text-foreground/70">{bloco.anotacao}</p>
                  )}
                </div>
                <form action={alternarRevisado.bind(null, bloco.sessaoId, bloco.assuntoId, !bloco.revisado)}>
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-foreground/60 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
                  >
                    {bloco.revisado ? "Reabrir" : "Marcar revisado"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
