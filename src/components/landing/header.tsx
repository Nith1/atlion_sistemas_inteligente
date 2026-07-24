"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#metodologia", label: "Metodologia" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [comFundo, setComFundo] = useState(false);

  useEffect(() => {
    function aoRolar() {
      setComFundo(window.scrollY > 24);
    }
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        comFundo
          ? "border-b border-white/[0.06] bg-[#08111D]/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={20} height={20} />
          <span className="text-xs font-semibold tracking-[0.3em] text-[#F5F3EF]">ATLION</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[#AAB4C3] md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-[#F5F3EF]">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/login" className="hidden text-sm text-[#AAB4C3] transition hover:text-[#F5F3EF] sm:inline">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#C8A15A] px-5 py-2 text-sm font-semibold text-[#08111D] transition hover:opacity-90"
          >
            Começar
          </Link>
        </div>
      </div>
    </header>
  );
}
