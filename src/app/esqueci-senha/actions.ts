"use server";

import { createClient } from "@/lib/supabase/server";

export type EsqueciSenhaState = { enviado: boolean };

export async function solicitarRecuperacao(
  _prevState: EsqueciSenhaState,
  formData: FormData
): Promise<EsqueciSenhaState> {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/redefinir-senha`,
  });

  // Sempre confirma o envio, exista ou não conta com esse email —
  // não dá pra revelar quais emails têm cadastro.
  return { enviado: true };
}
