import { ScrollReveal } from "./scroll-reveal";
import { DorVisual } from "./dor-visual";

export function Dor() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-28 sm:py-36 lg:grid-cols-2 lg:gap-16">
      <div>
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">A dor</p>
        </ScrollReveal>

        <ScrollReveal delayMs={80}>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
            Todo concurseiro acredita
            <br />
            que seu problema é disciplina.
          </h2>
        </ScrollReveal>

        <ScrollReveal delayMs={180}>
          <p className="mt-8 text-2xl font-semibold text-[#F5F3EF] sm:text-3xl">Não é.</p>
        </ScrollReveal>

        <ScrollReveal delayMs={260}>
          <p className="mt-3 max-w-lg text-lg text-[#AAB4C3]">
            Seu problema é tomar centenas de pequenas decisões todos os dias.
          </p>
        </ScrollReveal>
      </div>

      <ScrollReveal delayMs={200} className="flex justify-center lg:justify-end">
        <DorVisual />
      </ScrollReveal>
    </section>
  );
}
