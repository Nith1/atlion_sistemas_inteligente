import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Compara o ?token= da URL com o segredo configurado (KIWIFY_WEBHOOK_TOKEN).
// timingSafeEqual lança erro se os buffers tiverem tamanho diferente, então
// checa isso antes — tamanho do token não é segredo, só o valor é.
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
  orderStatus: string | undefined;
  customerEmail: string | undefined;
  customerName: string | undefined;
  orderId: string | undefined;
  subscriptionId: string | undefined;
};

// Nunca assume o formato do corpo — a Kiwify não documenta publicamente o
// payload completo. Optional chaining em tudo; qualquer campo ausente vira
// undefined em vez de derrubar o handler.
export function parsePayload(body: unknown): EventoKiwify {
  const b = body as Record<string, unknown> | null | undefined;
  const customer = b?.Customer as Record<string, unknown> | undefined;
  const subscription = b?.Subscription as Record<string, unknown> | undefined;

  return {
    orderStatus: typeof b?.order_status === "string" ? b.order_status : undefined,
    customerEmail: typeof customer?.email === "string" ? customer.email : undefined,
    customerName: typeof customer?.full_name === "string" ? customer.full_name : undefined,
    orderId: typeof b?.order_id === "string" ? b.order_id : undefined,
    subscriptionId: typeof subscription?.id === "string" ? subscription.id : undefined,
  };
}

export type AcaoAssinatura = {
  tipo: "estender" | "registrar" | "ignorar";
  status: string;
  periodoFim: Date | null;
};

// Decide o que fazer com cada order_status. periodoFim null significa "não
// mexe na data atual" (usado no cancelamento, que não deve cortar o período
// já pago — ver contexto no plano/migration 0025).
export function avaliarEvento(orderStatus: string, eventoEm: Date): AcaoAssinatura {
  switch (orderStatus) {
    case "compra_aprovada":
    case "subscription_renewed": {
      const periodoFim = new Date(eventoEm);
      periodoFim.setMonth(periodoFim.getMonth() + 1);
      return { tipo: "estender", status: "ativa", periodoFim };
    }

    case "compra_reembolsada":
    case "chargeback":
      // dinheiro já voltou (ou está em disputa) — corta o acesso na hora,
      // não importa em que ponto do período pago isso aconteceu (inclusive
      // dentro do direito de arrependimento de 7 dias do CDC art. 49 — quem
      // decide se aprova o reembolso é a Kiwify, o Atlion só reage)
      return { tipo: "registrar", status: orderStatus, periodoFim: eventoEm };

    case "subscription_canceled":
      // não estende nem corta — o período já pago continua valendo até
      // periodo_fim, só não renova depois disso
      return { tipo: "registrar", status: "cancelada", periodoFim: null };

    case "subscription_late":
      // decisão de julgamento (não pedida explicitamente): falha de
      // cobrança não bloqueia na hora, é prática padrão pra não punir
      // cliente por um cartão recusado uma vez. Como periodo_fim não é
      // estendido aqui, o acesso expira sozinho quando o período anterior
      // terminar, sem precisar de nenhum bloqueio ativo neste evento.
      return { tipo: "ignorar", status: "atrasada", periodoFim: null };

    default:
      // boleto_gerado, pix_gerado, compra_recusada, carrinho_abandonado, ou
      // qualquer valor desconhecido — não muda nada
      return { tipo: "ignorar", status: orderStatus, periodoFim: null };
  }
}
