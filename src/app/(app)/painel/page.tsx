import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ajustarTempoSessao, iniciarSessao } from "../sessao/actions";
import { AJUSTES_TEMPO, ETAPA_LABELS, MINUTOS_SUGERIDOS } from "@/lib/etapas";
import { MinutosEtapaEditavel } from "./minutos-etapa";

type EtapaPreview = { id: string; tipo: string; minutos_ajustados: number | null };

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
    .select("id, disciplina_id, ajuste_tempo")
    .eq("user_id", user.id)
    .eq("status", "em_andamento")
    .maybeSingle();

  const ajusteTempo = sessaoAtual?.ajuste_tempo ?? 1;

  let etapasPreview: EtapaPreview[] = [];
  let disciplinaNome: string | null = null;

  if (sessaoAtual) {
    const [{ data: etapasData }, { data: disciplinaData }] = await Promise.all([
      supabase
        .from("sessao_etapas")
        .select("id, tipo, minutos_ajustados")
        .eq("sessao_id", sessaoAtual.id)
        .order("ordem", { ascending: true }),
      supabase.from("disciplinas").select("nome").eq("id", sessaoAtual.disciplina_id).single(),
    ]);
    etapasPreview = etapasData ?? [];
    disciplinaNome = disciplinaData?.nome ?? null;
  }

  function minutosDaEtapa(etapa: EtapaPreview): number {
    return etapa.minutos_ajustados ?? Math.round((MINUTOS_SUGERIDOS[etapa.tipo] ?? 0) * ajusteTempo);
  }

  const tempoEstimadoMinutos = etapasPreview.reduce((soma, e) => soma + minutosDaEtapa(e), 0);
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
            {etapasPreview.map((etapa) => {
              const rotuloBase = ETAPA_LABELS[etapa.tipo] ?? etapa.tipo;
              const rotulo = etapa.tipo === "estudo" && disciplinaNome ? `${rotuloBase} — ${disciplinaNome}` : rotuloBase;
              return (
                <div
                  key={etapa.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-foreground">{rotulo}</span>
                  <MinutosEtapaEditavel etapaId={etapa.id} minutosAtual={minutosDaEtapa(etapa)} tipo={etapa.tipo} />
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-foreground/10 pt-4 text-sm">
            <span className="text-foreground/50">Tempo estimado</span>
            <span className="font-medium text-foreground">{tempoEstimadoMinutos} minutos</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-foreground/40">Tempo de hoje:</span>
            {AJUSTES_TEMPO.map((opcao) => (
              <form key={opcao.valor} action={ajustarTempoSessao.bind(null, sessaoAtual!.id, opcao.valor)}>
                <button
                  type="submit"
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    ajusteTempo === opcao.valor
                      ? "border-gold bg-gold/10 text-foreground"
                      : "border-foreground/15 text-foreground/50 hover:border-foreground/30"
                  }`}
                >
                  {opcao.label}
                </button>
              </form>
            ))}
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
