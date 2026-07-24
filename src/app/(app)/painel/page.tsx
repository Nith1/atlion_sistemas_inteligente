import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { iniciarSessao } from "../sessao/actions";
import { ETAPA_LABELS, MINUTOS_SUGERIDOS } from "@/lib/etapas";

type EtapaPreview = { tipo: string };

export default async function PainelPage() {
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

  const { data: sessaoAtual } = await supabase
    .from("sessoes")
    .select("id, disciplina_id")
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  let etapasPreview: EtapaPreview[] = [];
  let disciplinaNome: string | null = null;

  if (sessaoAtual) {
    const [{ data: etapasData }, { data: disciplinaData }] = await Promise.all([
      supabase
        .from("sessao_etapas")
        .select("tipo")
        .eq("sessao_id", sessaoAtual.id)
        .order("ordem", { ascending: true }),
      supabase.from("disciplinas").select("nome").eq("id", sessaoAtual.disciplina_id).single(),
    ]);
    etapasPreview = etapasData ?? [];
    disciplinaNome = disciplinaData?.nome ?? null;
  }

  const tempoEstimadoMinutos = etapasPreview.reduce((soma, e) => soma + (MINUTOS_SUGERIDOS[e.tipo] ?? 0), 0);
  const temSessaoPronta = sessaoAtual && etapasPreview.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm text-foreground/60">{profile.concurso}</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
        {temSessaoPronta ? "Sua preparação está pronta." : "Bem-vindo de volta."}
      </h1>
      {temSessaoPronta && (
        <p className="mt-2 text-sm text-foreground/60">
          Sua próxima sessão já foi organizada pelo Motor de Aprendizagem.
        </p>
      )}

      {temSessaoPronta ? (
        <div className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/3 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-foreground/40">Hoje você vai estudar</p>

          <div className="mt-4 space-y-2">
            {etapasPreview.map((etapa, i) => {
              const rotuloBase = ETAPA_LABELS[etapa.tipo] ?? etapa.tipo;
              const rotulo = etapa.tipo === "estudo" && disciplinaNome ? `${rotuloBase} — ${disciplinaNome}` : rotuloBase;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-foreground">{rotulo}</span>
                  <span className="shrink-0 text-foreground/50">{MINUTOS_SUGERIDOS[etapa.tipo] ?? 0} min</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-foreground/10 pt-4 text-sm">
            <span className="text-foreground/50">Tempo estimado</span>
            <span className="font-medium text-foreground">{tempoEstimadoMinutos} minutos</span>
          </div>

          <form action={iniciarSessao} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-md bg-gold px-8 py-4 text-base font-semibold text-navy hover:opacity-90"
            >
              Começar Sessão
            </button>
          </form>
        </div>
      ) : (
        <form action={iniciarSessao} className="mt-8">
          <button
            type="submit"
            className="rounded-md bg-gold px-8 py-4 text-lg font-semibold text-navy hover:opacity-90"
          >
            Estudar Agora
          </button>
        </form>
      )}
    </div>
  );
}
