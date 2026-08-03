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
  it("extrai os campos esperados de um payload bem formado", () => {
    const resultado = parsePayload({
      order_status: "compra_aprovada",
      order_id: "abc123",
      Customer: { email: "teste@example.com", full_name: "Teste" },
      Subscription: { id: "sub_1" },
    });

    expect(resultado).toEqual({
      orderStatus: "compra_aprovada",
      customerEmail: "teste@example.com",
      customerName: "Teste",
      orderId: "abc123",
      subscriptionId: "sub_1",
    });
  });

  it("não lança erro com corpo vazio, null ou em formato inesperado", () => {
    expect(parsePayload(null)).toEqual({
      orderStatus: undefined,
      customerEmail: undefined,
      customerName: undefined,
      orderId: undefined,
      subscriptionId: undefined,
    });
    expect(parsePayload({})).toEqual({
      orderStatus: undefined,
      customerEmail: undefined,
      customerName: undefined,
      orderId: undefined,
      subscriptionId: undefined,
    });
    expect(parsePayload("string qualquer")).toEqual({
      orderStatus: undefined,
      customerEmail: undefined,
      customerName: undefined,
      orderId: undefined,
      subscriptionId: undefined,
    });
  });
});

describe("avaliarEvento", () => {
  const agora = new Date("2026-08-03T12:00:00Z");

  it("compra_aprovada estende o período em 1 mês", () => {
    const resultado = avaliarEvento("compra_aprovada", agora);
    expect(resultado.tipo).toBe("estender");
    expect(resultado.status).toBe("ativa");
    expect(resultado.periodoFim?.toISOString()).toBe("2026-09-03T12:00:00.000Z");
  });

  it("subscription_renewed estende o período em 1 mês", () => {
    const resultado = avaliarEvento("subscription_renewed", agora);
    expect(resultado.tipo).toBe("estender");
    expect(resultado.periodoFim?.toISOString()).toBe("2026-09-03T12:00:00.000Z");
  });

  it("subscription_canceled não mexe no período (periodoFim null)", () => {
    const resultado = avaliarEvento("subscription_canceled", agora);
    expect(resultado.tipo).toBe("registrar");
    expect(resultado.status).toBe("cancelada");
    expect(resultado.periodoFim).toBeNull();
  });

  it("compra_reembolsada corta o período pra agora", () => {
    const resultado = avaliarEvento("compra_reembolsada", agora);
    expect(resultado.tipo).toBe("registrar");
    expect(resultado.periodoFim).toEqual(agora);
  });

  it("chargeback corta o período pra agora", () => {
    const resultado = avaliarEvento("chargeback", agora);
    expect(resultado.tipo).toBe("registrar");
    expect(resultado.periodoFim).toEqual(agora);
  });

  it("subscription_late ignora (não bloqueia por falha pontual de cobrança)", () => {
    const resultado = avaliarEvento("subscription_late", agora);
    expect(resultado.tipo).toBe("ignorar");
    expect(resultado.periodoFim).toBeNull();
  });

  it("eventos irrelevantes (boleto/pix/recusa/carrinho) e valores desconhecidos são ignorados", () => {
    for (const evento of ["boleto_gerado", "pix_gerado", "compra_recusada", "carrinho_abandonado", "algo_novo"]) {
      const resultado = avaliarEvento(evento, agora);
      expect(resultado.tipo).toBe("ignorar");
      expect(resultado.periodoFim).toBeNull();
    }
  });
});
