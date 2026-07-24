import { ScrollReveal } from "./scroll-reveal";

export function ProblemaInvisivel() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-36 text-center sm:py-48">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">O problema invisível</p>
      </ScrollReveal>

      <ScrollReveal delayMs={120}>
        <h2 className="mt-8 text-4xl font-semibold leading-[1.15] tracking-tight text-[#F5F3EF] sm:text-5xl md:text-6xl">
          Seu cérebro deveria aprender.
          <br />
          Não organizar.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={280}>
        <p className="mt-8 max-w-md text-lg text-[#AAB4C3]">
          Cada decisão consome energia que deveria estar sendo usada pra aprender.
        </p>
      </ScrollReveal>
    </section>
  );
}
