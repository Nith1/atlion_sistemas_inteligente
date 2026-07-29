import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";
import { InstalarAppLink } from "./instalar-app-link";

export function CtaFinal() {
  return (
    <section className="px-6 py-40 text-center sm:py-56">
      <ScrollReveal>
        <h2 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-[#F5F3EF] sm:text-5xl md:text-6xl">
          Pare de decidir.
          <br />
          Comece a estudar.
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={140} className="mt-12">
        <Link
          href="/signup"
          className="inline-block rounded-full bg-[#C8A15A] px-12 py-5 text-base font-semibold text-[#08111D] transition hover:opacity-90"
        >
          Começar agora
        </Link>
      </ScrollReveal>

      <ScrollReveal delayMs={220} className="mt-6">
        <InstalarAppLink />
      </ScrollReveal>
    </section>
  );
}
