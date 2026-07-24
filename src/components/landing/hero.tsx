import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";
import { HeroLiveCard } from "./hero-live-card";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-32 sm:pt-40 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <ScrollReveal>
          <h1 className="max-w-xl text-3xl font-semibold leading-[1.15] tracking-tight text-[#F5F3EF] sm:text-5xl sm:leading-[1.1] md:text-6xl">
            Você nunca decide.
            <br />A ATLION decide.
          </h1>
        </ScrollReveal>

        <ScrollReveal delayMs={120}>
          <p className="mt-6 max-w-sm text-base text-[#AAB4C3] sm:text-lg">
            Seu sistema operacional de estudos.
          </p>
        </ScrollReveal>

        <ScrollReveal delayMs={220} className="mt-10 flex flex-col items-center lg:items-start">
          <Link
            href="/signup"
            className="rounded-full bg-[#C8A15A] px-9 py-3.5 text-sm font-semibold text-[#08111D] transition hover:opacity-90"
          >
            Começar agora
          </Link>
          <Link href="/login" className="mt-5 text-sm text-[#AAB4C3] transition hover:text-[#F5F3EF]">
            Já tem conta? Entrar
          </Link>
        </ScrollReveal>
      </div>

      <ScrollReveal delayMs={340} className="flex justify-center lg:justify-end">
        <HeroLiveCard />
      </ScrollReveal>
    </section>
  );
}
