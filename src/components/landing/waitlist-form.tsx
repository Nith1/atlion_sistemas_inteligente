"use client";

import { useActionState } from "react";
import { entrarListaEspera, type WaitlistState } from "./actions";

const initialState: WaitlistState = { error: null, success: false };

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(entrarListaEspera, initialState);

  if (state.success) {
    return (
      <div className="mx-auto mt-10 max-w-sm space-y-2 rounded-lg border border-[#C8A15A]/30 bg-[#C8A15A]/10 p-4 text-sm text-[#F5F3EF]">
        <p>Você está na lista! Mandamos um email de confirmação agora.</p>
        <p className="text-[#AAB4C3]">
          Não achou na caixa de entrada? Dá uma olhada no Spam e marca como
          &quot;não é spam&quot; — assim você não perde o aviso quando
          abrirmos as primeiras vagas.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto mt-10 max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Seu melhor email"
            className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-[#F5F3EF] placeholder:text-[#AAB4C3] outline-none focus:border-[#C8A15A]"
          />
          <input
            name="whatsapp"
            type="tel"
            required
            placeholder="WhatsApp com DDD"
            className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-[#F5F3EF] placeholder:text-[#AAB4C3] outline-none focus:border-[#C8A15A]"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#C8A15A] px-9 py-3.5 text-sm font-semibold text-[#08111D] transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Entrar na lista"}
        </button>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
