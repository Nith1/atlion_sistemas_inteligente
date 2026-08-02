"use server";

import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";
import { enviarEmail, renderEmailHtml } from "@/lib/email";

export type WaitlistState = { error: string | null; success: boolean };

export async function entrarListaEspera(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = formData.get("email") as string;
  const whatsapp = formData.get("whatsapp") as string;

  if (!email || !whatsapp) {
    return { error: "Preenche email e WhatsApp.", success: false };
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    return { error: "Email inválido — confere o endereço digitado.", success: false };
  }

  // DDD brasileiro válido (11 a 99) + número de 8 ou 9 dígitos
  const digitosWhatsapp = whatsapp.replace(/\D/g, "");
  const ddd = Number(digitosWhatsapp.slice(0, 2));
  const whatsappValido =
    (digitosWhatsapp.length === 10 || digitosWhatsapp.length === 11) && ddd >= 11 && ddd <= 99;
  if (!whatsappValido) {
    return { error: "WhatsApp inválido — confere o número com DDD.", success: false };
  }

  const podeTentar = await verificarRateLimit("waitlist", email);
  if (!podeTentar) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo.", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("entrar_lista_espera", {
    p_email: email,
    p_whatsapp: whatsapp,
  });

  if (error || !data) {
    return { error: "Não deu pra entrar na lista agora. Tenta de novo.", success: false };
  }

  // já está na lista mesmo que o email de confirmação falhe — a inscrição
  // não pode depender da disponibilidade do Resend
  await enviarEmail({
    to: email,
    subject: "Você tá na lista de espera da ATLION",
    html: renderEmailHtml({
      titulo: "Você tá na lista",
      corpoHtml: `
        <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #4a5568;">
          A ATLION ainda tá em construção. Assim que abrirmos as primeiras
          vagas, você é um dos primeiros a saber — a gente avisa por aqui.
        </p>
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a5568;">
          Até lá, sem nada que você precise fazer.
        </p>
      `,
    }),
  });

  return { error: null, success: true };
}
