import { describe, expect, it } from "vitest";
import { dentroDoPeriodo, resolverPeriodo } from "./periodo";

describe("resolverPeriodo", () => {
  it("usa datas customizadas quando informadas, mesmo com período rápido presente", () => {
    const resultado = resolverPeriodo("7d", "2026-01-01", "2026-01-10");
    expect(resultado.inicio?.toISOString().startsWith("2026-01-01")).toBe(true);
    expect(resultado.label).toBe("2026-01-01 até 2026-01-10");
  });

  it("resolve 'hoje' como o dia atual", () => {
    const resultado = resolverPeriodo("hoje", undefined, undefined);
    const hoje = new Date();
    expect(resultado.inicio?.getDate()).toBe(hoje.getDate());
    expect(resultado.label).toBe("hoje");
  });

  it("cai em 'total' (sem início) quando não reconhece o período", () => {
    const resultado = resolverPeriodo(undefined, undefined, undefined);
    expect(resultado.inicio).toBeNull();
    expect(resultado.label).toBe("total");
  });
});

describe("dentroDoPeriodo", () => {
  const inicio = new Date("2026-01-05T00:00:00");
  const fim = new Date("2026-01-10T23:59:59");

  it("rejeita data nula", () => {
    expect(dentroDoPeriodo(null, inicio, fim)).toBe(false);
  });

  it("aceita data dentro do intervalo", () => {
    expect(dentroDoPeriodo("2026-01-07T12:00:00", inicio, fim)).toBe(true);
  });

  it("rejeita data antes do início", () => {
    expect(dentroDoPeriodo("2026-01-01T12:00:00", inicio, fim)).toBe(false);
  });

  it("rejeita data depois do fim", () => {
    expect(dentroDoPeriodo("2026-01-15T12:00:00", inicio, fim)).toBe(false);
  });

  it("sem início definido (período 'total'), só limita pelo fim", () => {
    expect(dentroDoPeriodo("2000-01-01T00:00:00", null, fim)).toBe(true);
  });
});
