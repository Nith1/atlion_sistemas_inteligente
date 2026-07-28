"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RedefinirSenhaState = { error?: string };

export async function redefinirSenha(
  _prevState: RedefinirSenhaState,
  formData: FormData
): Promise<RedefinirSenhaState> {
  const novaSenha = formData.get("novaSenha") as string;
  const confirmarSenha = formData.get("confirmarSenha") as string;

  if (!novaSenha || novaSenha.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { error: "As senhas não conferem." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { error: error.message };

  redirect("/painel");
}
