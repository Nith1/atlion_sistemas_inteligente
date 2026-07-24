import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";

export function Hero() {
  return (
    <section className="flex flex-col items-center px-6 pb-24 pt-32 text-center sm:pt-40">
      <ScrollReveal>
        <h1 className="max-w-2xl text-3xl font-semibold leading-[1.15] tracking-tight text-[#F5F3EF] sm:text-5xl sm:leading-[1.1] md:text-6xl">
          Você nunca decide.
          <br />A ATLION decide.
        </h1>
      </ScrollReveal>

      <ScrollReveal delayMs={120}>
        <p className="mt-6 max-w-sm text-base text-[#AAB4C3] sm:text-lg">
          Seu sistema operacional de estudos.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={220} className="mt-10 flex flex-col items-center">
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

      <ScrollReveal delayMs={340} className="mt-20 w-full max-w-lg sm:mt-24">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111D2D] p-6 text-left shadow-[0_0_100px_-25px_rgba(200,161,90,0.2)] sm:p-9">
          <p className="text-sm text-[#AAB4C3]">Boa noite.</p>
          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-[#AAB4C3]/70">
            Sua próxima ação
          </p>
          <p className="mt-2 text-xl font-semibold text-[#F5F3EF] sm:text-3xl">Direito Constitucional</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#AAB4C3]">
            <span>Ativação Cognitiva</span>
            <span className="h-1 w-1 rounded-full bg-[#AAB4C3]/40" />
            <span>25 minutos</span>
          </div>
          <div className="mt-7 rounded-md bg-[#C8A15A] py-2.5 text-center text-sm font-semibold text-[#08111D] sm:py-3">
            Começar sessão
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
