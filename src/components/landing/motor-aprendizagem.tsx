import { ScrollReveal } from "./scroll-reveal";
import { MotorVisual } from "./motor-visual";

const GATILHOS = [
  { pergunta: "Você errou?", resposta: "O motor recalcula." },
  { pergunta: "Ficou dias sem estudar?", resposta: "O motor recalcula." },
  { pergunta: "Terminou uma disciplina?", resposta: "O motor recalcula." },
  { pergunta: "Mudou de edital?", resposta: "O motor recalcula." },
];

const ANALISES = [
  "Motor analisa desempenho...",
  "Analisa erros...",
  "Analisa revisões...",
  "Detecta o que você já começou a esquecer...",
  "Calcula prioridades...",
  "Reorganiza a preparação...",
];

const PIPELINE = ["Ativação Cognitiva", "Estudo", "Consolidação", "Questões"];

export function MotorAprendizagem() {
  const atrasoBase = 250;
  const passo = 220;

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
        <div>
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">Como funciona</p>
          </ScrollReveal>

          <ScrollReveal delayMs={80}>
            <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
              O Motor de Aprendizagem.
            </h2>
          </ScrollReveal>

          <ScrollReveal delayMs={160}>
            <p className="mt-5 max-w-lg text-lg text-[#AAB4C3]">
              Enquanto você estuda, ele nunca para de observar.
            </p>
          </ScrollReveal>

          <ScrollReveal delayMs={280}>
            <p className="mt-8 max-w-lg text-xl font-medium leading-snug text-[#F5F3EF]">
              Com isso, ele recalcula automaticamente sua próxima sessão. Você nunca reorganiza nada.
              <span className="text-[#C8A15A]"> O motor reorganiza.</span>
            </p>
          </ScrollReveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {GATILHOS.map((gatilho, i) => (
              <ScrollReveal
                key={gatilho.pergunta}
                delayMs={i * 80}
                className="rounded-md border border-white/10 bg-[#111D2D] p-5"
              >
                <p className="text-sm text-[#AAB4C3]">{gatilho.pergunta}</p>
                <p className="mt-1 text-base font-semibold text-[#F5F3EF]">{gatilho.resposta}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal delayMs={200} className="flex justify-center lg:justify-end">
          <MotorVisual />
        </ScrollReveal>
      </div>

      <ScrollReveal delayMs={120} className="mt-24 sm:mt-32">
        <p className="text-center text-lg font-medium text-[#F5F3EF] sm:text-xl">
          Veja uma sessão sendo montada, agora.
        </p>
      </ScrollReveal>

      <div className="mt-10 rounded-2xl border border-white/6 bg-[#111D2D] p-8 shadow-[0_0_90px_-25px_rgba(200,161,90,0.2)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C8A15A]">Sessão concluída</p>

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
            <span className="text-base font-semibold text-[#F5F3EF]">
              Monta automaticamente a próxima sessão.
            </span>
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
