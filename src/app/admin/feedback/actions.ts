"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/painel");

  return { supabase, user };
}

export async function alternarResolvidoFeedback(id: string, resolvido: boolean) {
  const { supabase } = await requireAdmin();

  await supabase.from("feedback").update({ resolvido }).eq("id", id);

  revalidatePath("/admin/feedback");
}
