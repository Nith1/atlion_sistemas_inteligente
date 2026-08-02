"use client";

import { useState, useTransition } from "react";
import { reenviarConvite, revogarConvite } from "./actions";

type Convite = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

function statusConvite(convite: Convite) {
  if (convite.used_at) return "Usado";
  if (convite.revoked_at) return "Revogado";
  if (new Date(convite.expires_at) <= new Date()) return "Expirado";
  return "Pendente";
}

export function ConvitesLista({ convites }: { convites: Convite[] }) {
  if (convites.length === 0) {
    return <p className="py-3 text-sm text-foreground/50">Nenhum convite ainda.</p>;
  }

  return (
    <div className="divide-y divide-foreground/10 border-t border-foreground/10">
      {convites.map((convite) => (
        <LinhaConvite key={convite.id} convite={convite} />
      ))}
    </div>
  );
}

function LinhaConvite({ convite }: { convite: Convite }) {
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const status = statusConvite(convite);
  const podeAgir = status === "Pendente" || status === "Expirado";

  function copiarLink() {
    const link = `${process.env.NEXT_PUBLIC_SITE_URL}/convite/${convite.token}`;
    navigator.clipboard.writeText(link);
    setMensagem("Link copiado!");
  }

  function reenviar() {
    startTransition(async () => {
      const resultado = await reenviarConvite(convite.id);
      setMensagem(resultado.error ?? "Reenviado!");
    });
  }

  function revogar() {
    if (!confirm(`Revogar o convite de ${convite.email}? O link para de funcionar na hora.`)) return;
    startTransition(async () => {
      const resultado = await revogarConvite(convite.id);
      setMensagem(resultado.error ?? "Revogado.");
    });
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>{convite.email}</span>
        <span className="text-xs text-foreground/50">{status}</span>
      </div>
      {podeAgir && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copiarLink}
            disabled={pending}
            className="rounded-md border border-foreground/20 px-2.5 py-1 text-xs hover:bg-foreground/5 disabled:opacity-50"
          >
            Copiar link
          </button>
          <button
            type="button"
            onClick={reenviar}
            disabled={pending}
            className="rounded-md border border-foreground/20 px-2.5 py-1 text-xs hover:bg-foreground/5 disabled:opacity-50"
          >
            Reenviar
          </button>
          <button
            type="button"
            onClick={revogar}
            disabled={pending}
            className="rounded-md border border-red-600/30 px-2.5 py-1 text-xs text-red-600 hover:bg-red-600/5 disabled:opacity-50"
          >
            Revogar
          </button>
          {mensagem && <span className="text-xs text-foreground/50">{mensagem}</span>}
        </div>
      )}
    </div>
  );
}
