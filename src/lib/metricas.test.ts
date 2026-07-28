import { describe, expect, it } from "vitest";
import { calcularSequenciaDias, formatarDuracao } from "./metricas";

describe("formatarDuracao", () => {
  it("mostra só minutos quando dá menos de 1 hora", () => {
    expect(formatarDuracao(0)).toBe("0 min");
    expect(formatarDuracao(59)).toBe("1 min");
    expect(formatarDuracao(35 * 60)).toBe("35 min");
  });

  it("mostra horas e minutos com dois dígitos quando passa de 1 hora", () => {
    expect(formatarDuracao(60 * 60)).toBe("1h 00min");
    expect(formatarDuracao(90 * 60)).toBe("1h 30min");
    expect(formatarDuracao(2 * 3600 + 5 * 60)).toBe("2h 05min");
  });
});

describe("calcularSequenciaDias", () => {
  const diasAtras = (n: number) => {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() - n);
    return data;
  };

  it("retorna 0 sem nenhuma sessão concluída", () => {
    expect(calcularSequenciaDias([])).toBe(0);
  });

  it("conta a sequência incluindo hoje", () => {
    expect(calcularSequenciaDias([diasAtras(0), diasAtras(1), diasAtras(2)])).toBe(3);
  });

  it("tolera não ter estudado ainda hoje, contando a partir de ontem", () => {
    expect(calcularSequenciaDias([diasAtras(1), diasAtras(2)])).toBe(2);
  });

  it("zera a sequência se faltou um dia no meio", () => {
    expect(calcularSequenciaDias([diasAtras(0), diasAtras(2)])).toBe(1);
  });

  it("não conta duas sessões no mesmo dia como dois dias", () => {
    const hoje = diasAtras(0);
    const hojeMaisTarde = new Date(hoje);
    hojeMaisTarde.setHours(18, 0, 0, 0);
    expect(calcularSequenciaDias([hoje, hojeMaisTarde])).toBe(1);
  });
});
