"use server";

import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";

export type SignUpState = { error: string | null; success: boolean };

export async function signUp(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const podeTentar = await verificarRateLimit("signup", email);
  if (!podeTentar) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
