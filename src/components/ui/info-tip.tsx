"use client";

import { useState } from "react";

// Tooltip próprio em vez do atributo `title` nativo — `title` só aparece no
// hover do mouse e não funciona em telas de toque (mobile/tablet), onde não
// existe "passar por cima". Aqui funciona por toque/clique nos dois casos.
export function InfoTip({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        onBlur={() => setAberto(false)}
        aria-label="Mais informações"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-foreground/30 text-[10px] leading-none text-foreground/50 hover:border-foreground/50 hover:text-foreground"
      >
        ?
      </button>
      {aberto && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-md border border-foreground/15 bg-background px-3 py-2 text-xs font-normal normal-case leading-relaxed text-foreground shadow-lg"
        >
          {texto}
        </span>
      )}
    </span>
  );
}
