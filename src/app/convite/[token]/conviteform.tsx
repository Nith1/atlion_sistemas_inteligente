"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resgatarConvite, type ConviteState } from "./actions";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: ConviteState = { error: null };

export function ConviteForm({ token, email }: { token: string; email: string }) {
  const acaoComConvite = resgatarConvite.bind(null, token, email);
  const [state, formAction, pending] = useActionState(acaoComConvite, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <p className="mt-1 w-full rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm text-foreground/70">
          {email}
        </p>
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Crie sua senha
        </label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <div className="flex items-start gap-2">
        <input
          id="aceiteTermos"
          name="aceiteTermos"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-foreground/30"
        />
        <label htmlFor="aceiteTermos" className="text-sm text-foreground/70">
          Li e concordo com os{" "}
          <Link href="/termos-de-uso" target="_blank" className="underline underline-offset-4">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/politica-de-privacidade" target="_blank" className="underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
