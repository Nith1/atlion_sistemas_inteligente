import { ScrollReveal } from "./scroll-reveal";

const OBSERVA = ["desempenho", "revisões", "erros", "tempo sem revisar", "memória", "evolução"];

const GATILHOS = [
  { pergunta: "Você errou?", resposta: "O motor recalcula." },
  { pergunta: "Ficou dias sem estudar?", resposta: "O motor recalcula." },
  { pergunta: "Terminou uma disciplina?", resposta: "O motor recalcula." },
  { pergunta: "Mudou de edital?", resposta: "O motor recalcula." },
];

export function MotorAprendizagem() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">O motor por trás</p>
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

      <ScrollReveal delayMs={240} className="mt-8 flex flex-wrap gap-3">
        {OBSERVA.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#AAB4C3]"
          >
            {item}
          </span>
        ))}
      </ScrollReveal>

      <ScrollReveal delayMs={340}>
        <p className="mt-10 max-w-lg text-xl font-medium leading-snug text-[#F5F3EF]">
          Com isso, ele recalcula automaticamente sua próxima sessão. Você nunca reorganiza nada.
          <span className="text-[#C8A15A]"> O motor reorganiza.</span>
        </p>
      </ScrollReveal>

      <div className="mt-16 grid gap-3 sm:grid-cols-2">
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
    </section>
  );
}
