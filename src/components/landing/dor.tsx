import { ScrollReveal } from "./scroll-reveal";
import { DorVisual } from "./dor-visual";

export function Dor() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-28 sm:py-36 lg:grid-cols-2 lg:gap-16">
      <div>
        <ScrollReveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
            Todo concurseiro acredita
            <br />
            que seu problema é disciplina.
          </h2>
        </ScrollReveal>

        <ScrollReveal delayMs={100}>
          <p className="mt-8 text-2xl font-semibold text-[#F5F3EF] sm:text-3xl">Não é.</p>
        </ScrollReveal>

        <ScrollReveal delayMs={180}>
          <p className="mt-3 max-w-lg text-lg text-[#AAB4C3]">
            Seu problema é tomar centenas de pequenas decisões todos os dias. Energia que devia estar sendo
            usada pra aprender — não pra organizar.
          </p>
        </ScrollReveal>
      </div>

      <ScrollReveal delayMs={200} className="flex justify-center lg:justify-end">
        <DorVisual />
      </ScrollReveal>
    </section>
  );
}
