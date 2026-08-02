"use client";

import { useActionState } from "react";
import { enviarAvisoListaEspera, type EnviarAvisoState } from "./actions";
import { ConfirmButton } from "./confirm-button";

const initialState: EnviarAvisoState = { error: null, resultado: null };

export function BroadcastForm({ total }: { total: number }) {
  const [state, formAction, pending] = useActionState(enviarAvisoListaEspera, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="subject" className="block text-sm font-medium">
          Assunto
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <div>
        <label htmlFor="mensagem" className="block text-sm font-medium">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          required
          rows={6}
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.resultado && (
        <p className="text-sm text-foreground/70">
          Enviado pra {state.resultado.enviados} pessoa(s)
          {state.resultado.falharam > 0 && ` — ${state.resultado.falharam} falharam`}.
        </p>
      )}

      <ConfirmButton
        mensagem={`Isso manda email pra ${total} pessoa(s) na lista de espera. Confirma?`}
        className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar pra todo mundo"}
      </ConfirmButton>
    </form>
  );
}
