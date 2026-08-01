"use server";

import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";

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

  const digitosWhatsapp = whatsapp.replace(/\D/g, "");
  if (digitosWhatsapp.length < 10) {
    return { error: "WhatsApp inválido — inclui DDD.", success: false };
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

  return { error: null, success: true };
}
