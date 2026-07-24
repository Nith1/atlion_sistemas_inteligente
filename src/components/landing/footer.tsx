import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  const ano = new Date().getFullYear();

  return (
    <footer className="border-t border-white/6 bg-[#08111D] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={18} height={18} />
          <span className="text-xs font-semibold tracking-[0.3em] text-[#F5F3EF]">ATLION</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#AAB4C3]">
          <a href="#como-funciona" className="transition hover:text-[#F5F3EF]">
            Como Funciona
          </a>
          <a href="#metodologia" className="transition hover:text-[#F5F3EF]">
            Metodologia
          </a>
          <a href="#planos" className="transition hover:text-[#F5F3EF]">
            Planos
          </a>
          <a href="#faq" className="transition hover:text-[#F5F3EF]">
            FAQ
          </a>
          <Link href="/login" className="transition hover:text-[#F5F3EF]">
            Entrar
          </Link>
        </nav>
      </div>

      <p className="mt-10 text-center text-xs text-[#AAB4C3]/50">© {ano} ATLION. Todos os direitos reservados.</p>
    </footer>
  );
}
