"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { iniciarSessao } from "./sessao/actions";
import { sair } from "./painel/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icone: IconeDashboard },
  { href: "/planejamento", label: "Planejamento", Icone: IconePlanejamento },
  { href: "/caderno-erros", label: "Caderno de Erros", Icone: IconeCaderno },
  { href: "/estatisticas", label: "Estatísticas", Icone: IconeEstatisticas },
  { href: "/configuracoes", label: "Configurações", Icone: IconeConfig },
];

const CHAVE_COLAPSO = "atlion-sidebar-colapsada";

export function Sidebar() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [colapsada, setColapsada] = useState(false);

  useEffect(() => {
    // localStorage não existe no server — só dá pra ler depois de montar no
    // client, por isso não dá pra calcular isso direto no render (evitaria
    // o efeito, mas quebraria a hidratação).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.localStorage.getItem(CHAVE_COLAPSO) === "1") setColapsada(true);
  }, []);

  function alternarColapso() {
    setColapsada((atual) => {
      const novo = !atual;
      window.localStorage.setItem(CHAVE_COLAPSO, novo ? "1" : "0");
      return novo;
    });
  }

  return (
    <>
      {/* topo mobile */}
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3 md:hidden">
        <Link href="/painel" className="text-sm font-semibold tracking-[0.2em] text-foreground">
          ATLION
        </Link>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-foreground/60 hover:text-foreground"
        >
          <IconeMenu className="h-5 w-5" />
        </button>
      </header>

      {/* drawer mobile */}
      <AnimatePresence>
        {aberto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background px-4 py-6 shadow-xl md:hidden"
            >
              <NavConteudo pathname={pathname} onNavegar={() => setAberto(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* sidebar desktop */}
      {colapsada ? (
        <aside className="hidden w-10 shrink-0 flex-col items-center border-r border-foreground/10 py-6 md:flex">
          <button
            type="button"
            onClick={alternarColapso}
            aria-label="Mostrar menu"
            title="Mostrar menu"
            className="rounded-md p-1.5 text-foreground/30 transition hover:text-foreground"
          >
            <IconeChevron className="h-4 w-4 rotate-180" />
          </button>
        </aside>
      ) : (
        <aside className="hidden w-56 shrink-0 flex-col border-r border-foreground/10 px-4 py-6 md:flex">
          <NavConteudo pathname={pathname} onColapsar={alternarColapso} />
        </aside>
      )}
    </>
  );
}

function NavConteudo({
  pathname,
  onNavegar,
  onColapsar,
}: {
  pathname: string;
  onNavegar?: () => void;
  onColapsar?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <Link href="/painel" onClick={onNavegar} className="text-sm font-semibold tracking-[0.2em] text-foreground">
          ATLION
        </Link>
        {onColapsar && (
          <button
            type="button"
            onClick={onColapsar}
            aria-label="Esconder menu"
            title="Esconder menu"
            className="rounded-md p-1 text-foreground/30 transition hover:text-foreground"
          >
            <IconeChevron className="h-4 w-4" />
          </button>
        )}
      </div>

      <form action={iniciarSessao} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-medium text-navy hover:opacity-90"
        >
          <IconeEstudar className="h-4 w-4" />
          Estudar Agora
        </button>
      </form>

      <nav className="mt-6 flex flex-col gap-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const ativo = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavegar}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition ${
                ativo ? "bg-foreground/5 text-foreground" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <item.Icone className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={sair} className="mt-auto pt-6">
        <button type="submit" className="text-sm text-foreground/40 hover:text-foreground">
          Sair
        </button>
      </form>
    </div>
  );
}

function IconeChevron(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function IconeMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconeEstudar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 4l14 8-14 8V4Z" />
    </svg>
  );
}

function IconeDashboard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function IconePlanejamento(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v2h6V3M9 10h6M9 14h6M9 18h3" />
    </svg>
  );
}

function IconeCaderno(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Z" />
      <path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" />
      <path d="M10 9h6M10 13h6" />
    </svg>
  );
}

function IconeEstatisticas(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

function IconeConfig(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
