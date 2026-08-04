import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailConvite } from "@/lib/convites";
import { avaliarEvento, parsePayload, verificarTokenWebhook } from "@/lib/kiwify";

export async function POST(request: NextRequest) {
  if (!verificarTokenWebhook(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // corpo inválido — responde 200 mesmo assim pra não entrar num loop de
    // retry da Kiwify por causa de um bug nosso, não deles
    return NextResponse.json({ ok: true });
  }

  const evento = parsePayload(body);

  if (!evento.customerEmail || !evento.webhookEventType) {
    return NextResponse.json({ ok: true });
  }

  const acao = avaliarEvento(evento.webhookEventType, new Date(), evento.periodoFimSugerido);
  if (acao.tipo === "ignorar") {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const email = evento.customerEmail.trim().toLowerCase();

  const { data, error } = await admin
    .rpc("registrar_evento_assinatura", {
      p_email: email,
      p_status: acao.status,
      p_evento: evento.webhookEventType,
      p_evento_em: new Date().toISOString(),
      p_order_id: evento.orderId ?? null,
      p_subscription_id: evento.subscriptionId ?? null,
      p_periodo_fim: acao.periodoFim?.toISOString() ?? null,
    })
    .single<{ foi_criado: boolean }>();

  if (error) {
    console.error("[kiwify webhook] falha ao registrar evento:", error.message);
    // não é culpa da Kiwify — mas também não adianta pedir retry por um erro
    // nosso de banco, então ainda assim responde 200 (ok não confirma sucesso
    // real, só evita retry-storm; o erro fica no log pra investigação manual)
    return NextResponse.json({ ok: true });
  }

  // só manda convite na primeira compra desse email (foi_criado = true) —
  // renovação mensal (subscription_renewed numa linha que já existia) não
  // deve gerar convite novo
  if (acao.tipo === "estender" && data?.foi_criado) {
    const { data: convite } = await admin
      .rpc("criar_convite_sistema", { p_email: email })
      .single<{ token: string; expires_at: string }>();

    if (convite) {
      await enviarEmailConvite(email, convite.token);
    }
  }

  return NextResponse.json({ ok: true });
}
