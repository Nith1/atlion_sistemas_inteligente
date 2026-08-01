"use client";

import { useActionState, useState } from "react";
import { criarConvite, type CriarConviteState } from "./actions";

const initialState: CriarConviteState = { error: null, link: null };

export function ConviteForm() {
  const [state, formAction, pending] = useActionState(criarConvite, initialState);
  const [copiado, setCopiado] = useState(false);

  return (
    <div>
      <form
        action={(formData) => {
          setCopiado(false);
          formAction(formData);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="email@da-pessoa.com"
          className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Gerando..." : "Gerar convite"}
        </button>
      </form>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      {state.link && (
        <div className="mt-4 flex flex-col gap-2 rounded-md border border-foreground/10 bg-foreground/5 p-3 sm:flex-row sm:items-center">
          <code className="flex-1 break-all text-sm">{state.link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(state.link!);
              setCopiado(true);
            }}
            className="shrink-0 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
          >
            {copiado ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      )}
    </div>
  );
}
