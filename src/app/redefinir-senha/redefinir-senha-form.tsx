"use client";

import { useActionState } from "react";
import { redefinirSenha, type RedefinirSenhaState } from "./actions";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: RedefinirSenhaState = {};

export function RedefinirSenhaForm() {
  const [state, formAction, pending] = useActionState(redefinirSenha, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="novaSenha" className="block text-sm font-medium">
          Nova senha
        </label>
        <PasswordInput
          id="novaSenha"
          name="novaSenha"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <div>
        <label htmlFor="confirmarSenha" className="block text-sm font-medium">
          Confirmar nova senha
        </label>
        <PasswordInput
          id="confirmarSenha"
          name="confirmarSenha"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}
