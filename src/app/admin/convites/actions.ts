"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail, renderEmailHtml } from "@/lib/email";

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

async function enviarEmailConvite(email: string, token: string) {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/convite/${token}`;

  await enviarEmail({
    to: email,
    subject: "Você foi convidado pra ATLION",
    html: renderEmailHtml({
      titulo: "Você foi convidado",
      corpoHtml: `
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4a5568;">
          Alguém da ATLION liberou seu acesso antecipado. É só clicar no
          botão abaixo, criar sua senha e começar.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius: 8px; background-color: #c9a227;">
              <a
                href="${link}"
                style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #142440; text-decoration: none;"
              >
                Ativar meu acesso
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #9aa5b1;">
          Se o botão não funcionar, copie e cole este link no navegador:<br />
          <a href="${link}" style="color: #142440; word-break: break-all;">${link}</a>
        </p>
      `,
    }),
  });

  return link;
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

  // manda o convite direto pro email da pessoa — o admin ainda vê o link na
  // tela (retornado abaixo) pra também poder mandar por WhatsApp se quiser,
  // mas não depende mais de copiar/colar manualmente pra todo mundo
  const link = await enviarEmailConvite(email, data.token);

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
