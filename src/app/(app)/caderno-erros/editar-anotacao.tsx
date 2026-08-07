"use client";

import { useState, useTransition } from "react";
import { atualizarAnotacao } from "./actions";

// Fora de um <form> de propósito — esse componente já mora dentro do <li>
// do bloco, que por sua vez já tem o <form> do botão "Marcar revisado"
// (ver page.tsx); HTML não permite <form> aninhado, então a chamada à
// server action é feita direto, via useTransition, em vez de action={}.
export function EditarAnotacao({
  sessaoId,
  assuntoId,
  anotacaoInicial,
}: {
  sessaoId: string;
  assuntoId: string | null;
  anotacaoInicial: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(anotacaoInicial ?? "");
  const [salvo, setSalvo] = useState(anotacaoInicial);
  const [pending, startTransition] = useTransition();

  if (!editando) {
    return (
      <div className="mt-2 flex items-start justify-between gap-3">
        {salvo ? (
          <p className="text-sm text-foreground/70">{salvo}</p>
        ) : (
          <p className="text-sm text-foreground/40">Nenhuma anotação ainda.</p>
        )}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="shrink-0 text-xs text-foreground/50 underline underline-offset-4 hover:text-foreground"
        >
          {salvo ? "Editar" : "Adicionar"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        rows={3}
        placeholder="Ex: confundi prazo de recurso com o de prescrição"
        className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await atualizarAnotacao(sessaoId, assuntoId, valor);
              setSalvo(valor.trim() || null);
              setEditando(false);
            });
          }}
          className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValor(salvo ?? "");
            setEditando(false);
          }}
          className="rounded-md px-3 py-1.5 text-xs text-foreground/60 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
