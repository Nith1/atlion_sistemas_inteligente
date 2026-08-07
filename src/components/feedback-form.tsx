"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { enviarFeedback, type FeedbackState } from "./feedback-actions";

const initialState: FeedbackState = { error: null, success: false };

export function FeedbackForm() {
  const pathname = usePathname();
  const [tipo, setTipo] = useState<"sugestao" | "bug">("sugestao");
  const [state, formAction, pending] = useActionState(enviarFeedback, initialState);

  if (state.success) {
    return (
      <div className="mt-8 rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-foreground">
        Recebemos! Obrigado por ajudar a melhorar a ATLION.
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="pagina" value={pathname} />

      <div className="flex gap-2">
        {(
          [
            { valor: "sugestao", label: "Sugestão" },
            { valor: "bug", label: "Reportar bug" },
          ] as const
        ).map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => setTipo(opcao.valor)}
            className={`rounded-md px-4 py-2 text-sm font-medium ring-1 transition ${
              tipo === opcao.valor
                ? "bg-navy text-white ring-navy"
                : "text-foreground/60 ring-foreground/20 hover:text-foreground"
            }`}
          >
            {opcao.label}
          </button>
        ))}
        <input type="hidden" name="tipo" value={tipo} />
      </div>

      <div>
        <label className="block text-xs text-foreground/50">
          {tipo === "bug" ? "O que aconteceu" : "Sua sugestão"}
        </label>
        <textarea
          name="mensagem"
          required
          rows={6}
          maxLength={2000}
          placeholder={
            tipo === "bug"
              ? "Ex: ao apertar Enter no campo de erros, a sessão terminou sozinha"
              : "Ex: seria bom ter um jeito de..."
          }
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="block text-xs text-foreground/50">Email (opcional, caso queira uma resposta)</label>
        <input
          name="email"
          type="email"
          placeholder="seu@email.com"
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar"}
      </button>

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
    </form>
  );
}
