import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { avaliarEvento, parsePayload, verificarTokenWebhook } from "./kiwify";

function requestComToken(token: string | null) {
  const url = new URL("https://atlionestudos.com.br/api/webhooks/kiwify");
  if (token !== null) url.searchParams.set("token", token);
  return new NextRequest(url);
}

describe("verificarTokenWebhook", () => {
  const original = process.env.KIWIFY_WEBHOOK_TOKEN;

  it("aceita quando o token bate", () => {
    process.env.KIWIFY_WEBHOOK_TOKEN = "segredo-123";
    expect(verificarTokenWebhook(requestComToken("segredo-123"))).toBe(true);
    process.env.KIWIFY_WEBHOOK_TOKEN = original;
  });

  it("rejeita token errado", () => {
    process.env.KIWIFY_WEBHOOK_TOKEN = "segredo-123";
    expect(verificarTokenWebhook(requestComToken("outro-valor"))).toBe(false);
    process.env.KIWIFY_WEBHOOK_TOKEN = original;
  });

  it("rejeita token de tamanho diferente sem lançar erro", () => {
    process.env.KIWIFY_WEBHOOK_TOKEN = "segredo-123";
    expect(verificarTokenWebhook(requestComToken("s"))).toBe(false);
    process.env.KIWIFY_WEBHOOK_TOKEN = original;
  });

  it("rejeita quando não há token na URL", () => {
    process.env.KIWIFY_WEBHOOK_TOKEN = "segredo-123";
    expect(verificarTokenWebhook(requestComToken(null))).toBe(false);
    process.env.KIWIFY_WEBHOOK_TOKEN = original;
  });

  it("rejeita quando KIWIFY_WEBHOOK_TOKEN não está configurado", () => {
    process.env.KIWIFY_WEBHOOK_TOKEN = "";
    expect(verificarTokenWebhook(requestComToken("qualquer"))).toBe(false);
    process.env.KIWIFY_WEBHOOK_TOKEN = original;
  });
});

describe("parsePayload", () => {
  it("extrai os campos esperados de um payload bem formado, com data real de próxima cobrança", () => {
    const resultado = parsePayload({
      webhook_event_type: "order_approved",
      order_status: "paid",
      order_id: "abc123",
      Customer: { email: "teste@example.com", full_name: "Teste" },
      Subscription: { id: "sub_1", next_payment: "2026-09-01T10:00:00.000Z" },
    });

    expect(resultado).toEqual({
      webhookEventType: "order_approved",
      orderStatus: "paid",
      customerEmail: "teste@example.com",
      customerName: "Teste",
      orderId: "abc123",
      subscriptionId: "sub_1",
      periodoFimSugerido: new Date("2026-09-01T10:00:00.000Z"),
    });
  });

  it("extrai um payload real de teste da Kiwify (pix_created, 04/08/2026)", () => {
    const resultado = parsePayload({
      order_id: "19bee1af-3158-452d-90b0-4c4f1d87bff7",
      order_status: "waiting_payment",
      webhook_event_type: "pix_created",
      Customer: { full_name: "John Doe", email: "johndoe@example.com" },
      Subscription: {
        id: "9b528368-3cdb-4086-81df-d76ddfcbffb3",
        next_payment: "2026-08-08T11:02:29.919Z",
        status: "active",
      },
    });

    expect(resultado.webhookEventType).toBe("pix_created");
    expect(resultado.orderStatus).toBe("waiting_payment");
    expect(resultado.customerEmail).toBe("johndoe@example.com");
    expect(resultado.periodoFimSugerido).toEqual(new Date("2026-08-08T11:02:29.919Z"));
  });

  it("não lança erro com corpo vazio, null ou em formato inesperado", () => {
    const vazio = {
      webhookEventType: undefined,
      orderStatus: undefined,
      customerEmail: undefined,
      customerName: undefined,
      orderId: undefined,
      subscriptionId: undefined,
      periodoFimSugerido: null,
    };

    expect(parsePayload(null)).toEqual(vazio);
    expect(parsePayload({})).toEqual(vazio);
    expect(parsePayload("string qualquer")).toEqual(vazio);
  });

  it("ignora next_payment em formato de data inválido", () => {
    const resultado = parsePayload({ Subscription: { next_payment: "não-é-uma-data" } });
    expect(resultado.periodoFimSugerido).toBeNull();
  });
});

describe("avaliarEvento", () => {
  const agora = new Date("2026-08-03T12:00:00Z");

  it("order_approved usa periodoFimSugerido quando disponível", () => {
    const sugerido = new Date("2026-09-10T00:00:00Z");
    const resultado = avaliarEvento("order_approved", agora, sugerido);
    expect(resultado.tipo).toBe("estender");
    expect(resultado.status).toBe("ativa");
    expect(resultado.periodoFim).toEqual(sugerido);
  });

  it("order_approved cai no fallback de +1 mês quando a Kiwify não manda next_payment", () => {
    const resultado = avaliarEvento("order_approved", agora, null);
    expect(resultado.tipo).toBe("estender");
    expect(resultado.periodoFim?.toISOString()).toBe("2026-09-03T12:00:00.000Z");
  });

  it("subscription_renewed estende o período", () => {
    const resultado = avaliarEvento("subscription_renewed", agora, null);
    expect(resultado.tipo).toBe("estender");
    expect(resultado.periodoFim?.toISOString()).toBe("2026-09-03T12:00:00.000Z");
  });

  it("subscription_canceled (e a grafia 'cancelled') não mexem no período (periodoFim null)", () => {
    for (const evento of ["subscription_canceled", "subscription_cancelled"]) {
      const resultado = avaliarEvento(evento, agora, null);
      expect(resultado.tipo).toBe("registrar");
      expect(resultado.status).toBe("cancelada");
      expect(resultado.periodoFim).toBeNull();
    }
  });

  it("order_refunded corta o período pra agora, mesmo com periodoFimSugerido presente", () => {
    const resultado = avaliarEvento("order_refunded", agora, new Date("2026-09-10T00:00:00Z"));
    expect(resultado.tipo).toBe("registrar");
    expect(resultado.periodoFim).toEqual(agora);
  });

  it("chargeback corta o período pra agora", () => {
    const resultado = avaliarEvento("chargeback", agora, null);
    expect(resultado.tipo).toBe("registrar");
    expect(resultado.periodoFim).toEqual(agora);
  });

  it("subscription_late (e 'subscription_delayed') ignoram — não bloqueiam por falha pontual de cobrança", () => {
    for (const evento of ["subscription_late", "subscription_delayed"]) {
      const resultado = avaliarEvento(evento, agora, null);
      expect(resultado.tipo).toBe("ignorar");
      expect(resultado.periodoFim).toBeNull();
    }
  });

  it("eventos irrelevantes (pix/boleto/carrinho/recusa) e valores desconhecidos são ignorados", () => {
    for (const evento of ["pix_created", "billet_created", "abandoned_cart", "order_rejected", "algo_novo", undefined]) {
      const resultado = avaliarEvento(evento, agora, null);
      expect(resultado.tipo).toBe("ignorar");
      expect(resultado.periodoFim).toBeNull();
    }
  });
});
