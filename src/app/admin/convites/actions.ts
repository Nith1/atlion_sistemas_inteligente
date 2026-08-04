"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enviarEmailConvite } from "@/lib/convites";

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

const TAMANHO_MAXIMO_MENSAGEM = 500;

export async function criarConvite(
  _prevState: CriarConviteState,
  formData: FormData
): Promise<CriarConviteState> {
  const { supabase } = await requireAdmin();

  const email = (formData.get("email") as string)?.trim();
  if (!email || !email.includes("@")) {
    return { error: "Email inválido.", link: null };
  }

  // mensagem pessoal opcional pro convite manual — nunca confiar só na
  // validação client (maxLength do textarea), revalidar tamanho aqui
  // também (seguranca.md §6)
  const mensagemBruta = (formData.get("mensagem") as string) ?? "";
  const mensagem = mensagemBruta.trim();
  if (mensagem.length > TAMANHO_MAXIMO_MENSAGEM) {
    return { error: `Mensagem muito longa (máx. ${TAMANHO_MAXIMO_MENSAGEM} caracteres).`, link: null };
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

  // manda o convite direto pro email da pessoa — o admin ainda vê o link na
  // tela (retornado abaixo) pra também poder mandar por WhatsApp se quiser,
  // mas não depende mais de copiar/colar manualmente pra todo mundo
  const link = await enviarEmailConvite(email, data.token, mensagem || undefined);

  return { error: null, link };
}

export type AcaoConviteResultado = { error: string | null; link: string | null };

// Renova a validade (mais 14 dias) e reenvia o email com o mesmo link —
// serve tanto pra "esqueceu de checar o email" quanto pra reviver um
// convite que expirou sem ser usado.
export async function reenviarConvite(inviteId: string): Promise<AcaoConviteResultado> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .rpc("renovar_convite", { p_invite_id: inviteId })
    .single<{ email: string; token: string } | null>();

  if (error || !data) {
    return { error: "Esse convite já foi usado ou revogado — gera um novo.", link: null };
  }

  revalidatePath("/admin/convites");

  const link = await enviarEmailConvite(data.email, data.token);
  return { error: null, link };
}

// Invalida o link na hora — quem clicar depois disso vê "convite inválido".
export async function revogarConvite(inviteId: string): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();

  const { data } = await supabase.rpc("revogar_convite", { p_invite_id: inviteId });

  if (!data) {
    return { error: "Não foi possível revogar (talvez já tenha sido usado)." };
  }

  revalidatePath("/admin/convites");
  return { error: null };
}
