import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatarDuracao, calcularSequenciaDias } from "@/lib/metricas";
import { ETAPA_LABELS } from "@/lib/etapas";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("concurso, onboarding_completo")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completo) redirect("/onboarding");

  const { data: disciplinasData } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .eq("user_id", user.id)
    .eq("ativa", true)
    .order("ordem", { ascending: true });
  const disciplinas = disciplinasData ?? [];
  const disciplinaIds = disciplinas.map((d) => d.id);

  const { data: sessoesData } = await supabase
    .from("sessoes")
    .select("id, disciplina_id, status, concluida_em")
    .eq("user_id", user.id);
  const sessoes = sessoesData ?? [];
  const sessaoIdParaDisciplina = new Map(sessoes.map((s) => [s.id, s.disciplina_id]));
  const sessaoIds = sessoes.map((s) => s.id);
  const sessaoAtual = sessoes.find((s) => s.status === "em_andamento") ?? null;

  const { data: etapasData } =
    sessaoIds.length > 0
      ? await supabase
          .from("sessao_etapas")
          .select("sessao_id, tipo, ordem, concluida, tempo_gasto_segundos")
          .in("sessao_id", sessaoIds)
      : { data: [] as { sessao_id: string; tipo: string; ordem: number; concluida: boolean; tempo_gasto_segundos: number | null }[] };
  const etapas = etapasData ?? [];

  const { data: questoesData } = await supabase
    .from("questoes_registro")
    .select("disciplina_id, acertou, revisado")
    .eq("user_id", user.id);
  const questoes = questoesData ?? [];

  const { data: assuntosData } =
    disciplinaIds.length > 0
      ? await supabase.from("assuntos").select("disciplina_id, ja_estudado").in("disciplina_id", disciplinaIds)
      : { data: [] as { disciplina_id: string; ja_estudado: boolean }[] };
  const assuntos = assuntosData ?? [];

  // métricas gerais (sempre "total", sem filtro de período — isso já existe
  // em detalhe nas Estatísticas; aqui é só o resumo)
  const tempoTotalSegundos = etapas.reduce((soma, e) => soma + (e.tempo_gasto_segundos ?? 0), 0);
  const sessoesConcluidas = sessoes.filter((s) => s.status === "concluida").length;
  const acertoGeral =
    questoes.length > 0 ? Math.round((questoes.filter((q) => q.acertou).length / questoes.length) * 100) : null;
  const sequenciaDias = calcularSequenciaDias(
    sessoes.filter((s) => s.status === "concluida" && s.concluida_em).map((s) => new Date(s.concluida_em as string))
  );

  // conta em blocos (sessão + assunto), igual ao Caderno de Erros — não em
  // linhas soltas, senão o número não bate com o que aparece lá
  const { data: errosData } = await supabase
    .from("questoes_registro")
    .select("sessao_id, assunto_id")
    .eq("user_id", user.id)
    .eq("acertou", false)
    .eq("revisado", false);

  const errosPendentes = new Set(
    (errosData ?? []).map((erro) => `${erro.sessao_id}:${erro.assunto_id ?? "sem-assunto"}`)
  );

  // mesma ordem que o Motor usa pra escolher a próxima disciplina (escolherDisciplina,
  // em sessao/actions.ts): quem nunca foi estudada vem primeiro, depois da mais
  // antiga pra mais recente — é literalmente o ciclo de rotação entre as matérias.
  const ultimaConclusaoPorDisciplina = new Map<string, string>();
  for (const s of [...sessoes]
    .filter((s) => s.status === "concluida" && s.concluida_em)
    .sort((a, b) => new Date(b.concluida_em as string).getTime() - new Date(a.concluida_em as string).getTime())) {
    if (!ultimaConclusaoPorDisciplina.has(s.disciplina_id)) {
      ultimaConclusaoPorDisciplina.set(s.disciplina_id, s.concluida_em as string);
    }
  }
  const cicloDisciplinas = [...disciplinas].sort((a, b) => {
    const dataA = ultimaConclusaoPorDisciplina.get(a.id);
    const dataB = ultimaConclusaoPorDisciplina.get(b.id);
    if (!dataA && !dataB) return 0;
    if (!dataA) return -1;
    if (!dataB) return 1;
    return new Date(dataA).getTime() - new Date(dataB).getTime();
  });

  const disciplinasVisao = disciplinas.slice(0, 5).map((disciplina) => {
    const assuntosDisciplina = assuntos.filter((a) => a.disciplina_id === disciplina.id);
    const assuntosEstudados = assuntosDisciplina.filter((a) => a.ja_estudado).length;
    return { id: disciplina.id, nome: disciplina.nome, assuntosEstudados, assuntosTotal: assuntosDisciplina.length };
  });

  const etapaAtualDaSessao = sessaoAtual
    ? etapas
        .filter((e) => e.sessao_id === sessaoAtual.id && !e.concluida)
        .sort((a, b) => a.ordem - b.ordem)[0]
    : null;
  const disciplinaDaSessaoAtual = sessaoAtual
    ? disciplinas.find((d) => d.id === sessaoIdParaDisciplina.get(sessaoAtual.id))?.nome
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <p className="text-sm text-foreground/60">{profile.concurso}</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground">Dashboard</h1>

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
          <p className="mt-1 text-lg font-semibold text-foreground">{acertoGeral !== null ? `${acertoGeral}%` : "—"}</p>
        </div>
      </div>

      <div className="mt-10 rounded-md border border-foreground/10 bg-foreground/3 p-5">
        {sessaoAtual && etapaAtualDaSessao ? (
          <>
            <p className="text-xs font-medium uppercase tracking-widest text-foreground/40">Próxima ação</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {ETAPA_LABELS[etapaAtualDaSessao.tipo] ?? etapaAtualDaSessao.tipo}
              {disciplinaDaSessaoAtual ? ` · ${disciplinaDaSessaoAtual}` : ""}
            </p>
            <Link
              href="/painel"
              className="mt-3 inline-block rounded-md bg-gold px-5 py-2 text-sm font-semibold text-navy hover:opacity-90"
            >
              Continuar sessão
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/60">Nenhuma sessão em andamento agora.</p>
            <Link
              href="/painel"
              className="mt-3 inline-block rounded-md bg-gold px-5 py-2 text-sm font-semibold text-navy hover:opacity-90"
            >
              Estudar Agora
            </Link>
          </>
        )}
      </div>

      {cicloDisciplinas.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-foreground/70">Ciclo de estudos</h2>
          <p className="mt-1 text-xs text-foreground/50">
            A ordem que a ATLION vai seguir, começando pela que está há mais tempo parada.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {cicloDisciplinas.map((disciplina, i) => (
              <div key={disciplina.id} className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    i === 0 ? "border-gold bg-gold/10 text-foreground" : "border-foreground/15 text-foreground/60"
                  }`}
                >
                  {disciplina.nome}
                </span>
                {i < cicloDisciplinas.length - 1 && <span className="text-foreground/25">→</span>}
              </div>
            ))}
            {cicloDisciplinas.length > 1 && (
              <span className="ml-1 flex items-center gap-1 text-xs text-foreground/40">
                <IconeLoop className="h-3.5 w-3.5" />
                recomeça
              </span>
            )}
          </div>
        </div>
      )}

      {disciplinasVisao.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground/70">Disciplinas</h2>
            <Link href="/planejamento" className="text-xs text-foreground/50 underline underline-offset-4 hover:text-foreground">
              Ver todas
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {disciplinasVisao.map((linha) => (
              <li key={linha.id} className="rounded-md border border-foreground/10 bg-foreground/3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{linha.nome}</span>
                  <span className="text-xs text-foreground/50">
                    {linha.assuntosTotal > 0 ? `${linha.assuntosEstudados}/${linha.assuntosTotal}` : "sem assuntos"}
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

      <div className="mt-10 flex items-center justify-between rounded-md border border-foreground/10 bg-foreground/3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Caderno de Erros</p>
          <p className="text-xs text-foreground/50">
            {errosPendentes.size > 0
              ? `${errosPendentes.size} ${errosPendentes.size === 1 ? "pendência" : "pendências"} de revisão`
              : "Nenhum erro pendente"}
          </p>
        </div>
        <Link href="/caderno-erros" className="text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground">
          Ver
        </Link>
      </div>
    </div>
  );
}

function IconeLoop(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  );
}
