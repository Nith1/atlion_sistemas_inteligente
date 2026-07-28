"use client";

import { useActionState } from "react";
import { solicitarRecuperacao, type EsqueciSenhaState } from "./actions";

const initialState: EsqueciSenhaState = { enviado: false };

export function EsqueciSenhaForm() {
  const [state, formAction, pending] = useActionState(solicitarRecuperacao, initialState);

  if (state.enviado) {
    return (
      <div className="mt-8 rounded-lg border border-gold/30 bg-gold/5 p-4 text-sm text-foreground">
        Se esse email tiver uma conta na ATLION, mandamos um link pra redefinir a senha. Confira também a caixa de spam.
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </button>
    </form>
  );
}
