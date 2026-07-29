"use server";

import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";

export type EsqueciSenhaState = { enviado: boolean; erro?: string };

export async function solicitarRecuperacao(
  _prevState: EsqueciSenhaState,
  formData: FormData
): Promise<EsqueciSenhaState> {
  const email = formData.get("email") as string;

  // Limite mais apertado aqui: cada tentativa dispara um email de verdade —
  // sem isso, dá pra usar esse formulário pra encher a caixa de entrada de
  // outra pessoa. A mensagem de limite não revela se o email tem conta ou
  // não (mesma garantia do "enviado: true" abaixo).
  const podeTentar = await verificarRateLimit("esqueciSenha", email);
  if (!podeTentar) {
    return { enviado: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/redefinir-senha`,
  });

  // Sempre confirma o envio, exista ou não conta com esse email —
  // não dá pra revelar quais emails têm cadastro.
  return { enviado: true };
}
