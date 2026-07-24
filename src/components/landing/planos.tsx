import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";

export function Planos() {
  return (
    <section id="planos" className="mx-auto max-w-2xl px-6 py-28 text-center sm:py-36">
      <ScrollReveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8A15A]">Planos</p>
      </ScrollReveal>

      <ScrollReveal delayMs={80}>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Acesso antecipado.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={160}>
        <p className="mx-auto mt-5 max-w-md text-lg text-[#AAB4C3]">
          A ATLION ainda está em construção. Entre agora e ajude a moldar o sistema — sem custo, por tempo limitado.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={240} className="mt-10">
        <Link
          href="/signup"
          className="inline-block rounded-full bg-[#C8A15A] px-9 py-3.5 text-sm font-semibold text-[#08111D] transition hover:opacity-90"
        >
          Quero acesso antecipado
        </Link>
      </ScrollReveal>
    </section>
  );
}
