"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";

export type LoginState = { error: string | null };

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const podeTentar = await verificarRateLimit("login", email);
  if (!podeTentar) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/painel");
}
