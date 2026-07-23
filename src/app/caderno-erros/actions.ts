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

// Marca (ou desmarca) como revisada toda a leva de erros de um mesmo
// assunto dentro de uma mesma sessão — é assim que o Caderno de Erros
// agrupa questões erradas na tela.
export async function alternarRevisado(sessaoId: string, assuntoId: string | null, revisado: boolean) {
  const { supabase, user } = await requireUser();

  let query = supabase
    .from("questoes_registro")
    .update({ revisado })
    .eq("user_id", user.id)
    .eq("sessao_id", sessaoId)
    .eq("acertou", false);

  query = assuntoId ? query.eq("assunto_id", assuntoId) : query.is("assunto_id", null);

  await query;

  revalidatePath("/caderno-erros");
}
