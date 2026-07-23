import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolverPeriodo, dentroDoPeriodo } from "@/lib/periodo";
import { FiltroPeriodoDisciplina } from "@/components/filtro-periodo-disciplina";

function formatarDuracao(segundosTotais: number): string {
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.round((segundosTotais % 3600) / 60);
  if (horas === 0) return `${minutos} min`;
  return `${horas}h ${String(minutos).padStart(2, "0")}min`;
}

// Sequência de dias consecutivos com pelo menos uma sessão concluída,
// tolerando não ter estudado ainda hoje (conta a partir de ontem nesse caso).
function calcularSequenciaDias(datasConcluidas: Date[]): number {
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

type Disciplina = { id: string; nome: string };

export default async function EstatisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string; disciplina?: string }>;
}) {
  const { periodo, de, ate, disciplina: disciplinaParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: disciplinasData } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .eq("user_id", user.id)
    .eq("ativa", true)
    .order("ordem", { ascending: true });
  const disciplinas = (disciplinasData ?? []) as Disciplina[];
  const disciplinaIds = disciplinas.map((d) => d.id);

  const { data: sessoesData } = await supabase
    .from("sessoes")
    .select("id, disciplina_id, status, concluida_em")
    .eq("user_id", user.id);
  const sessoes = sessoesData ?? [];
  const sessaoIdParaDisciplina = new Map(sessoes.map((s) => [s.id, s.disciplina_id]));
  const sessaoIds = sessoes.map((s) => s.id);

  const { data: etapasData } =
    sessaoIds.length > 0
      ? await supabase
          .from("sessao_etapas")
          .select("sessao_id, tempo_gasto_segundos, concluida_em")
          .in("sessao_id", sessaoIds)
      : { data: [] as { sessao_id: string; tempo_gasto_segundos: number | null; concluida_em: string | null }[] };
  const etapas = etapasData ?? [];

  const { data: questoesData } = await supabase
    .from("questoes_registro")
    .select("disciplina_id, acertou, created_at")
    .eq("user_id", user.id);
  const questoes = questoesData ?? [];

  const { data: assuntosData } =
    disciplinaIds.length > 0
      ? await supabase.from("assuntos").select("disciplina_id, ja_estudado").in("disciplina_id", disciplinaIds)
      : { data: [] as { disciplina_id: string; ja_estudado: boolean }[] };
  const assuntos = assuntosData ?? [];

  const disciplinaAtiva = disciplinaParam && disciplinaParam !== "todas" ? disciplinaParam : null;
  const nomeDisciplinaAtiva = disciplinaAtiva ? disciplinas.find((d) => d.id === disciplinaAtiva)?.nome : null;

  const { inicio, fim, label: labelPeriodo } = resolverPeriodo(periodo, de, ate);

  // sessões/etapas/questões já filtradas por disciplina (quando houver) — a
  // sequência de dias usa essas, mas ignora o filtro de período (streak é
  // sempre "até hoje", não faz sentido cortar por período).
  const sessoesDaDisciplina = disciplinaAtiva ? sessoes.filter((s) => s.disciplina_id === disciplinaAtiva) : sessoes;

  const etapasFiltradas = etapas.filter((e) => {
    const disc = sessaoIdParaDisciplina.get(e.sessao_id);
    if (disciplinaAtiva && disc !== disciplinaAtiva) return false;
    return dentroDoPeriodo(e.concluida_em, inicio, fim);
  });

  const questoesFiltradas = questoes.filter((q) => {
    if (disciplinaAtiva && q.disciplina_id !== disciplinaAtiva) return false;
    return dentroDoPeriodo(q.created_at, inicio, fim);
  });

  const sessoesConcluidasFiltradas = sessoesDaDisciplina.filter(
    (s) => s.status === "concluida" && dentroDoPeriodo(s.concluida_em, inicio, fim)
  );

  const tempoTotalSegundos = etapasFiltradas.reduce((soma, e) => soma + (e.tempo_gasto_segundos ?? 0), 0);
  const sessoesConcluidas = sessoesConcluidasFiltradas.length;

  const acertoGeral =
    questoesFiltradas.length > 0
      ? Math.round((questoesFiltradas.filter((q) => q.acertou).length / questoesFiltradas.length) * 100)
      : null;

  const sequenciaDias = calcularSequenciaDias(
    sessoesDaDisciplina.filter((s) => s.status === "concluida" && s.concluida_em).map((s) => new Date(s.concluida_em as string))
  );

  const linhas = disciplinaAtiva
    ? []
    : disciplinas.map((disciplina) => {
        const tempoSegundos = etapasFiltradas.reduce((soma, e) => {
          const disciplinaDaSessao = sessaoIdParaDisciplina.get(e.sessao_id);
          return disciplinaDaSessao === disciplina.id ? soma + (e.tempo_gasto_segundos ?? 0) : soma;
        }, 0);

        const questoesDisciplina = questoesFiltradas.filter((q) => q.disciplina_id === disciplina.id);
        const acertoDisciplina =
          questoesDisciplina.length > 0
            ? Math.round((questoesDisciplina.filter((q) => q.acertou).length / questoesDisciplina.length) * 100)
            : null;

        const assuntosDisciplina = assuntos.filter((a) => a.disciplina_id === disciplina.id);
        const assuntosEstudados = assuntosDisciplina.filter((a) => a.ja_estudado).length;

        return {
          id: disciplina.id,
          nome: disciplina.nome,
          tempoSegundos,
          acertoDisciplina,
          assuntosEstudados,
          assuntosTotal: assuntosDisciplina.length,
        };
      });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/50 hover:text-foreground">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Estatísticas</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Mostrando: {labelPeriodo} · {nomeDisciplinaAtiva ?? "todas as disciplinas"}
      </p>

      <FiltroPeriodoDisciplina
        basePath="/estatisticas"
        periodo={periodo}
        de={de}
        ate={ate}
        disciplinaParam={disciplinaParam}
        disciplinas={disciplinas}
      />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-foreground/10 bg-foreground/3 p-4">
          <p className="text-xs text-foreground/50">Tempo estudado</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatarDuracao(tempoTotalSegundos)}</p>
        </div>
        <div className="rounded-md border border-foreground/10 bg-foreground/3 p-4">
          <p className="text-xs text-foreground/50">Sessões concluídas</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{sessoesConcluidas}</p>
        </div>
        <div className="rounded-md border border-foreground/10 bg-foreground/3 p-4">
          <p className="text-xs text-foreground/50">Sequência de dias</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{sequenciaDias}</p>
        </div>
        <div className="rounded-md border border-foreground/10 bg-foreground/3 p-4">
          <p className="text-xs text-foreground/50">Acerto em questões</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {acertoGeral !== null ? `${acertoGeral}%` : "—"}
          </p>
        </div>
      </div>

      {linhas.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-foreground/70">Por disciplina</h2>
          <ul className="mt-4 space-y-3">
            {linhas.map((linha) => (
              <li key={linha.id} className="rounded-md border border-foreground/10 bg-foreground/3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{linha.nome}</p>
                  <p className="text-xs text-foreground/50">{formatarDuracao(linha.tempoSegundos)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-foreground/50">
                  <span>
                    {linha.assuntosTotal > 0
                      ? `${linha.assuntosEstudados}/${linha.assuntosTotal} assuntos estudados`
                      : "sem assuntos cadastrados"}
                  </span>
                  <span>
                    {linha.acertoDisciplina !== null ? `${linha.acertoDisciplina}% de acerto` : "sem questões ainda"}
                  </span>
                </div>
                {linha.assuntosTotal > 0 && (
                  <div className="mt-2 h-1 w-full rounded-full bg-foreground/10">
                    <div
                      className="h-1 rounded-full bg-gold"
                      style={{ width: `${Math.round((linha.assuntosEstudados / linha.assuntosTotal) * 100)}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
