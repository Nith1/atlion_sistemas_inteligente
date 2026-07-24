import { ScrollReveal } from "./scroll-reveal";

const ANALISES = [
  "Analisando desempenho...",
  "Analisando revisões...",
  "Analisando erros...",
  "Calculando retenção...",
  "Montando próxima sessão...",
];

const PIPELINE = ["Ativação Cognitiva", "Estudo", "Consolidação", "Questões"];

export function SessaoConstruida() {
  const atrasoBase = 250;
  const passo = 220;

  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">Ao vivo</p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Uma sessão sendo montada, agora.
        </h2>
      </ScrollReveal>

      <div className="mt-14 rounded-2xl border border-white/[0.06] bg-[#111D2D] p-8 shadow-[0_0_90px_-25px_rgba(200,161,90,0.2)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C8A15A]">Motor de Aprendizagem</p>

        <div className="mt-6 space-y-3">
          {ANALISES.map((linha, i) => (
            <ScrollReveal key={linha} delayMs={atrasoBase + i * passo} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#AAB4C3]/50" />
              <span className="text-sm text-[#AAB4C3]">{linha}</span>
            </ScrollReveal>
          ))}
          <ScrollReveal
            delayMs={atrasoBase + ANALISES.length * passo + 100}
            className="flex items-center gap-3"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8A15A]" />
            <span className="text-base font-semibold text-[#F5F3EF]">Sessão pronta.</span>
          </ScrollReveal>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/10 pt-8">
          {PIPELINE.map((etapa, i) => (
            <ScrollReveal
              key={etapa}
              delayMs={atrasoBase + (ANALISES.length + 1) * passo + 200 + i * 140}
              className="flex items-center gap-3"
            >
              <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[#F5F3EF]">
                {etapa}
              </span>
              {i < PIPELINE.length - 1 && <span className="text-[#AAB4C3]/40">→</span>}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
