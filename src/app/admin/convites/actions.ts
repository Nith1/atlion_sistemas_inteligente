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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/painel");

  return { supabase, user };
}

export type CriarConviteState = { error: string | null; link: string | null };

export async function criarConvite(
  _prevState: CriarConviteState,
  formData: FormData
): Promise<CriarConviteState> {
  const { supabase } = await requireAdmin();

  const email = (formData.get("email") as string)?.trim();
  if (!email || !email.includes("@")) {
    return { error: "Email inválido.", link: null };
  }

  // a própria função revalida is_admin no servidor — não confia só no
  // requireAdmin() daqui, é defesa em camadas
  const { data, error } = await supabase
    .rpc("criar_convite", { p_email: email })
    .single<{ token: string; expires_at: string }>();

  if (error || !data) {
    return { error: "Não foi possível criar o convite.", link: null };
  }

  revalidatePath("/admin/convites");

  return {
    error: null,
    link: `${process.env.NEXT_PUBLIC_SITE_URL}/convite/${data.token}`,
  };
}
