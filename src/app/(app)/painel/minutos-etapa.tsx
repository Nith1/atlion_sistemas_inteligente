"use client";

import { useState } from "react";
import { ajustarMinutosEtapa } from "../sessao/actions";
import { avisoTempoBaixo } from "@/lib/etapas";

export function MinutosEtapaEditavel({
  etapaId,
  minutosAtual,
  tipo,
}: {
  etapaId: string;
  minutosAtual: number;
  tipo: string;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(minutosAtual);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(minutosAtual);
          setEditando(true);
        }}
        title="Ajustar tempo dessa etapa"
        className="shrink-0 text-foreground/50 underline decoration-dotted underline-offset-4 hover:text-foreground"
      >
        {minutosAtual} min
      </button>
    );
  }

  const aviso = avisoTempoBaixo(tipo, valor);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <form
        action={ajustarMinutosEtapa.bind(null, etapaId)}
        className="flex items-center gap-1.5"
        onSubmit={() => setEditando(false)}
      >
        <input
          type="number"
          name="minutos"
          min={1}
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          autoFocus
          className="w-14 rounded border border-foreground/20 bg-transparent px-1.5 py-0.5 text-right text-sm outline-none focus:border-gold"
        />
        <span className="text-xs text-foreground/40">min</span>
        <button type="submit" className="text-xs font-medium text-gold hover:opacity-80">
          confirmar
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="text-xs text-foreground/40 hover:text-foreground"
        >
          cancelar
        </button>
      </form>
      {aviso && <p className="max-w-[200px] text-right text-xs text-gold/90">{aviso}</p>}
    </div>
  );
}
