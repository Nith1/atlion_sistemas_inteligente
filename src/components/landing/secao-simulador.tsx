import { ScrollReveal } from "./scroll-reveal";
import { Simulador } from "./simulador";

export function SecaoSimulador() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-28 sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">Veja ao vivo</p>
      </ScrollReveal>
      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 max-w-lg text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Experimente quebrar a ATLION.
        </h2>
      </ScrollReveal>
      <ScrollReveal delayMs={160}>
        <p className="mt-5 max-w-lg text-lg text-[#AAB4C3]">Faça qualquer coisa. O sistema recalcula.</p>
      </ScrollReveal>

      <ScrollReveal delayMs={260} className="mt-12">
        <Simulador />
      </ScrollReveal>
    </section>
  );
}
