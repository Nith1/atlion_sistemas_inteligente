"use server";

import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";

export type ConviteState = { error: string | null; success: boolean };

export async function resgatarConvite(
  token: string,
  email: string,
  _prevState: ConviteState,
  formData: FormData
): Promise<ConviteState> {
  const password = formData.get("password") as string;

  const podeTentar = await verificarRateLimit("signup", email);
  if (!podeTentar) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo.", success: false };
  }

  const supabase = await createClient();

  // revalida o convite no servidor mesmo que a página já tenha checado —
  // nunca confiar só no que o cliente diz que é válido
  const { data: convite, error: erroConvite } = await supabase
    .rpc("validar_convite", { p_token: token })
    .single<{ email: string | null; valido: boolean }>();

  if (erroConvite || !convite?.valido || convite.email !== email) {
    return { error: "Esse convite não é mais válido.", success: false };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error || !signUpData.user) {
    return { error: error?.message ?? "Não foi possível criar a conta.", success: false };
  }

  const { data: resgatado } = await supabase.rpc("resgatar_convite", {
    p_token: token,
    p_email: email,
    p_user_id: signUpData.user.id,
  });

  if (!resgatado) {
    return { error: "Esse convite já foi usado ou expirou.", success: false };
  }

  return { error: null, success: true };
}
