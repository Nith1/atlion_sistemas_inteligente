import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";

export function CtaFinal() {
  return (
    <section className="px-6 py-32 text-center sm:py-40">
      <ScrollReveal>
        <h2 className="mx-auto max-w-xl text-3xl font-semibold leading-tight tracking-tight text-[#F5F3EF] sm:text-4xl md:text-5xl">
          Pare de decidir.
          <br />
          Comece a estudar.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={140} className="mt-10">
        <Link
          href="/signup"
          className="inline-block rounded-full bg-[#C8A15A] px-10 py-4 text-base font-semibold text-[#08111D] transition hover:opacity-90"
        >
          Começar agora
        </Link>
      </ScrollReveal>
    </section>
  );
}
