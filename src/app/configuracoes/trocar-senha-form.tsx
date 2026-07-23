"use client";

import { useActionState } from "react";
import { alterarSenha } from "./actions";

export function TrocarSenhaForm() {
  const [estado, formAction, pending] = useActionState(alterarSenha, {});

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs text-foreground/50">Nova senha</label>
        <input
          name="novaSenha"
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-foreground/50">Confirmar nova senha</label>
        <input
          name="confirmarSenha"
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </div>
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      {estado.sucesso && <p className="text-sm text-foreground/60">Senha atualizada.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
