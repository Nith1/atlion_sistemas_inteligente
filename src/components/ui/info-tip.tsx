"use client";

import { useEffect, useState } from "react";

const CHAVE_VISTO = (id: string) => `atlion-infotip-visto-${id}`;

// Tooltip próprio em vez do atributo `title` nativo — `title` só aparece no
// hover do mouse e não funciona em telas de toque (mobile/tablet), onde não
// existe "passar por cima". Aqui funciona por toque/clique nos dois casos.
//
// `id` + `autoAbrir`: pra orientações importantes demais pra depender da
// pessoa notar a bolinha "?" sozinha (ex: metodologia da sessão de estudo)
// — abre sozinho na primeira vez que aparece pra esse navegador, e nunca
// mais depois disso (guardado no localStorage, não precisa de tabela nova).
// Continua funcionando por clique normalmente em qualquer caso.
export function InfoTip({ texto, id, autoAbrir }: { texto: string; id?: string; autoAbrir?: boolean }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!autoAbrir || !id) return;
    if (window.localStorage.getItem(CHAVE_VISTO(id))) return;
    window.localStorage.setItem(CHAVE_VISTO(id), "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAberto(true);
  }, [autoAbrir, id]);

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
