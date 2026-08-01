import { ScrollReveal } from "./scroll-reveal";
import { WaitlistForm } from "./waitlist-form";

export function Planos() {
  return (
    <section id="lista-de-espera" className="mx-auto max-w-2xl px-6 py-28 text-center sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">Acesso antecipado</p>
      </ScrollReveal>

      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Entre na lista de espera.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={160}>
        <p className="mx-auto mt-5 max-w-md text-lg text-[#AAB4C3]">
          A ATLION ainda está em construção e o acesso é por convite. Deixa
          seu contato e a gente avisa assim que abrir uma vaga.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={240}>
        <WaitlistForm />
      </ScrollReveal>
    </section>
  );
}
