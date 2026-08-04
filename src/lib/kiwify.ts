import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Compara o ?token= da URL com o segredo configurado (KIWIFY_WEBHOOK_TOKEN).
// timingSafeEqual lança erro se os buffers tiverem tamanho diferente, então
// checa isso antes — tamanho do token não é segredo, só o valor é.
//
// A Kiwify também acrescenta seu próprio ?signature= (provavelmente HMAC
// usando o "Token" separado do painel dela) — não validamos isso ainda,
// só o nosso token. Reforçar com a assinatura real fica como próximo passo
// de segurança, não bloqueia o funcionamento hoje.
export function verificarTokenWebhook(request: NextRequest): boolean {
  const recebido = request.nextUrl.searchParams.get("token");
  const esperado = process.env.KIWIFY_WEBHOOK_TOKEN;

  if (!recebido || !esperado) return false;

  const bufRecebido = Buffer.from(recebido);
  const bufEsperado = Buffer.from(esperado);
  if (bufRecebido.length !== bufEsperado.length) return false;

  return timingSafeEqual(bufRecebido, bufEsperado);
}

export type EventoKiwify = {
  webhookEventType: string | undefined;
  orderStatus: string | undefined;
  customerEmail: string | undefined;
  customerName: string | undefined;
  orderId: string | undefined;
  subscriptionId: string | undefined;
  periodoFimSugerido: Date | null;
};

// Nunca assume o formato do corpo. Confirmado com um payload real de teste
// da Kiwify (04/08/2026): o campo que identifica o evento é
// `webhook_event_type` (ex: "pix_created"), não `order_status` (que é só o
// estado da ordem, ex: "waiting_payment") — os dois existem no payload mas
// significam coisas diferentes. A Kiwify também manda a data real da
// próxima cobrança em `Subscription.next_payment`, melhor que calcular "+1
// mês" por conta própria.
export function parsePayload(body: unknown): EventoKiwify {
  const b = body as Record<string, unknown> | null | undefined;
  const customer = b?.Customer as Record<string, unknown> | undefined;
  const subscription = b?.Subscription as Record<string, unknown> | undefined;

  const nextPayment = typeof subscription?.next_payment === "string" ? new Date(subscription.next_payment) : null;

  return {
    webhookEventType: typeof b?.webhook_event_type === "string" ? b.webhook_event_type : undefined,
    orderStatus: typeof b?.order_status === "string" ? b.order_status : undefined,
    customerEmail: typeof customer?.email === "string" ? customer.email : undefined,
    customerName: typeof customer?.full_name === "string" ? customer.full_name : undefined,
    orderId: typeof b?.order_id === "string" ? b.order_id : undefined,
    subscriptionId: typeof subscription?.id === "string" ? subscription.id : undefined,
    periodoFimSugerido: nextPayment && !isNaN(nextPayment.getTime()) ? nextPayment : null,
  };
}

export type AcaoAssinatura = {
  tipo: "estender" | "registrar" | "ignorar";
  status: string;
  periodoFim: Date | null;
};

// Decide o que fazer com cada webhook_event_type. periodoFim null significa
// "não mexe na data atual" (usado no cancelamento, que não deve cortar o
// período já pago — ver contexto no plano/migration 0025).
//
// ATENÇÃO: só "pix_created" foi confirmado com um payload real (o botão de
// teste da Kiwify parece sempre simular esse mesmo evento). Os outros
// valores abaixo (order_approved, subscription_renewed, etc — incluindo
// variações de grafia como "canceled"/"cancelled") são a melhor tentativa
// seguindo o padrão observado, mas não foram vistos ao vivo ainda. Antes de
// abrir cadastro público de verdade, vale fazer uma compra real (pode ser a
// promocional de R$19,90, cancelando/reembolsando depois) só pra confirmar
// o nome exato do evento "compra aprovada" — é o mais crítico dos dois,
// porque é o que libera acesso.
export function avaliarEvento(webhookEventType: string | undefined, eventoEm: Date, periodoFimSugerido: Date | null): AcaoAssinatura {
  switch (webhookEventType) {
    case "order_approved":
    case "subscription_renewed":
      return { tipo: "estender", status: "ativa", periodoFim: periodoFimSugerido ?? estenderUmMes(eventoEm) };

    case "order_refunded":
    case "chargeback":
      // dinheiro já voltou (ou está em disputa) — corta o acesso na hora,
      // não importa em que ponto do período pago isso aconteceu (inclusive
      // dentro do direito de arrependimento de 7 dias do CDC art. 49 — quem
      // decide se aprova o reembolso é a Kiwify, o Atlion só reage)
      return { tipo: "registrar", status: webhookEventType, periodoFim: eventoEm };

    case "subscription_canceled":
    case "subscription_cancelled":
      // não estende nem corta — o período já pago continua valendo até
      // periodo_fim, só não renova depois disso
      return { tipo: "registrar", status: "cancelada", periodoFim: null };

    case "subscription_late":
    case "subscription_delayed":
      // decisão de julgamento (não pedida explicitamente): falha de
      // cobrança não bloqueia na hora, é prática padrão pra não punir
      // cliente por um cartão recusado uma vez. Como periodo_fim não é
      // estendido aqui, o acesso expira sozinho quando o período anterior
      // terminar, sem precisar de nenhum bloqueio ativo neste evento.
      return { tipo: "ignorar", status: "atrasada", periodoFim: null };

    default:
      // pix_created, billet_created, abandoned_cart, order_rejected, ou
      // qualquer valor desconhecido/ainda não confirmado — não muda nada
      return { tipo: "ignorar", status: webhookEventType ?? "desconhecido", periodoFim: null };
  }
}

function estenderUmMes(data: Date): Date {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + 1);
  return resultado;
}
