import Image from "next/image";
import Link from "next/link";

function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={`opacity-0 [animation:fadeInUp_0.7s_ease-out_forwards] ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-[#08111D] px-6 py-20 text-center sm:py-28">
      <Reveal className="flex items-center gap-2.5">
        <Image src="/logo-mark.png" alt="" width={26} height={26} priority />
        <span className="text-xs font-semibold tracking-[0.35em] text-[#F5F3EF]">ATLION</span>
      </Reveal>

      <Reveal delayMs={120} className="mt-16 max-w-2xl sm:mt-20">
        <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-[#F5F3EF] sm:text-5xl sm:leading-[1.1] md:text-6xl">
          Você nunca decide.
          <br />
          A ATLION decide.
        </h1>
      </Reveal>

      <Reveal delayMs={240} className="mt-6">
        <p className="max-w-sm text-base text-[#AAB4C3] sm:text-lg">Seu sistema operacional de estudos.</p>
      </Reveal>

      <Reveal delayMs={360} className="mt-10 flex flex-col items-center">
        <Link
          href="/signup"
          className="rounded-full bg-[#C8A15A] px-9 py-3.5 text-sm font-semibold text-[#08111D] transition hover:opacity-90"
        >
          Começar agora
        </Link>
        <Link href="/login" className="mt-5 text-sm text-[#AAB4C3] transition hover:text-[#F5F3EF]">
          Já tem conta? Entrar
        </Link>
      </Reveal>

      <Reveal delayMs={520} className="mt-20 w-full max-w-md sm:mt-24">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111D2D] p-6 text-left shadow-[0_0_80px_-20px_rgba(200,161,90,0.18)] sm:p-8">
          <p className="text-sm text-[#AAB4C3]">Boa noite.</p>
          <p className="mt-4 text-xs font-medium uppercase tracking-widest text-[#AAB4C3]/70">
            Sua próxima ação
          </p>
          <p className="mt-2 text-xl font-semibold text-[#F5F3EF] sm:text-2xl">Direito Constitucional</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#AAB4C3]">
            <span>Ativação Cognitiva</span>
            <span className="h-1 w-1 rounded-full bg-[#AAB4C3]/40" />
            <span>25 minutos</span>
          </div>
          <div className="mt-7 rounded-md bg-[#C8A15A] py-2.5 text-center text-sm font-semibold text-[#08111D]">
            Começar sessão
          </div>
        </div>
      </Reveal>
    </main>
  );
}
