"use server";

import { createClient } from "@/lib/supabase/server";
import { verificarRateLimit } from "@/lib/rate-limit";

export type FeedbackState = { error: string | null; success: boolean };

// Usado tanto pela landing (sem sessão) quanto pelo app — a função
// enviar_feedback (0026_feedback.sql) lê auth.uid() no servidor e aceita
// null, então não precisa de dois caminhos de código diferentes.
export async function enviarFeedback(_prevState: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const tipo = formData.get("tipo") as string;
  const mensagem = ((formData.get("mensagem") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim();
  const pagina = ((formData.get("pagina") as string) ?? "").trim();

  if (tipo !== "sugestao" && tipo !== "bug") {
    return { error: "Escolhe se é sugestão ou bug.", success: false };
  }
  if (!mensagem || mensagem.length > 2000) {
    return { error: "Escreve sua mensagem (até 2000 caracteres).", success: false };
  }

  const podeTentar = await verificarRateLimit("feedback", email || "anonimo");
  if (!podeTentar) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo.", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enviar_feedback", {
    p_tipo: tipo,
    p_mensagem: mensagem,
    p_pagina: pagina || null,
    p_email: email || null,
  });

  if (error || !data) {
    return { error: "Não deu pra enviar agora. Tenta de novo.", success: false };
  }

  return { error: null, success: true };
}
