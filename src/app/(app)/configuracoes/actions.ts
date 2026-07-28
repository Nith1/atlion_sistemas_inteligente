"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function salvarConfiguracoes(formData: FormData) {
  const { supabase, user } = await requireUser();

  const horasLiquidasDia = formData.get("horasLiquidasDia")
    ? Number(formData.get("horasLiquidasDia"))
    : null;

  await supabase
    .from("profiles")
    .update({
      concurso: (formData.get("concurso") as string)?.trim(),
      horas_liquidas_dia: horasLiquidasDia,
      curso_preparatorio: (formData.get("cursoPreparatorio") as string)?.trim() || null,
      ativacao_modo: formData.get("ativacaoModo") as string,
      tem_edital: formData.get("temEdital") === "on",
      trabalha: formData.get("trabalha") === "on",
    })
    .eq("id", user.id);

  revalidatePath("/configuracoes");
}

type EstadoSenha = { error?: string; sucesso?: boolean };

export async function alterarSenha(_estadoAnterior: EstadoSenha, formData: FormData): Promise<EstadoSenha> {
  const { supabase } = await requireUser();

  const novaSenha = formData.get("novaSenha") as string;
  const confirmarSenha = formData.get("confirmarSenha") as string;

  if (!novaSenha || novaSenha.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { error: "As senhas não conferem." };
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { error: error.message };

  return { sucesso: true };
}

// Apaga disciplinas (o que cascateia assuntos, sessões, etapas e o registro
// de questões — ver 0001_init.sql) e devolve o profile pro estado de antes do
// onboarding. A conta continua existindo, só o progresso é zerado.
export async function resetarTudo() {
  const { supabase, user } = await requireUser();

  await supabase.from("disciplinas").delete().eq("user_id", user.id);

  await supabase
    .from("profiles")
    .update({
      onboarding_completo: false,
      concurso: null,
      tem_edital: false,
      horas_liquidas_dia: null,
      trabalha: false,
      curso_preparatorio: null,
      ativacao_modo: "questoes",
    })
    .eq("id", user.id);

  redirect("/onboarding");
}

// Apaga a conta de verdade, via RPC (ver 0008_cancelar_conta.sql) — a role
// authenticated não tem permissão de apagar auth.users diretamente.
export async function cancelarConta() {
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("delete_user");
  if (error) return;

  await supabase.auth.signOut();
  redirect("/login?conta=encerrada");
}
