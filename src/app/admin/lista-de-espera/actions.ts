"use server";

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

export type EnviarAvisoState = {
  error: string | null;
  resultado: { enviados: number; falharam: number } | null;
};

export async function enviarAvisoListaEspera(
  _prevState: EnviarAvisoState,
  formData: FormData
): Promise<EnviarAvisoState> {
  const { supabase } = await requireAdmin();

  const subject = (formData.get("subject") as string)?.trim();
  const mensagem = (formData.get("mensagem") as string)?.trim();

  if (!subject || !mensagem) {
    return { error: "Preenche assunto e mensagem.", resultado: null };
  }

  const { data: inscritos, error } = await supabase.from("waitlist").select("email");

  if (error) {
    return { error: "Não deu pra carregar a lista de espera.", resultado: null };
  }

  const corpoHtml = mensagem
    .split("\n")
    .filter((linha) => linha.trim().length > 0)
    .map(
      (linha) =>
        `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #4a5568;">${linha}</p>`
    )
    .join("");

  let enviados = 0;
  let falharam = 0;

  // um envio por vez (nunca CC/BCC coletivo — não expor email de um
  // inscrito pro outro) — lista pequena de pré-lançamento, sequencial é
  // suficiente e evita estourar rate limit do Resend
  for (const inscrito of inscritos ?? []) {
    const ok = await enviarEmail({
      to: inscrito.email,
      subject,
      html: renderEmailHtml({ titulo: subject, corpoHtml }),
    });
    if (ok) enviados++;
    else falharam++;
  }

  return { error: null, resultado: { enviados, falharam } };
}
