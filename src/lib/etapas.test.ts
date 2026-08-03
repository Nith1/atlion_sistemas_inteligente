import { describe, expect, it } from "vitest";
import { sessoesPrevistasHoje } from "./etapas";

describe("sessoesPrevistasHoje", () => {
  it("sem informação de horas líquidas, assume 1 sessão", () => {
    expect(sessoesPrevistasHoje(null)).toBe(1);
    expect(sessoesPrevistasHoje(undefined)).toBe(1);
    expect(sessoesPrevistasHoje(0)).toBe(1);
  });

  it("3 horas cabem numa sessão só (138 min de referência)", () => {
    expect(sessoesPrevistasHoje(3)).toBe(1);
  });

  it("5 horas cabem em duas sessões inteiras", () => {
    expect(sessoesPrevistasHoje(5)).toBe(2);
  });

  it("nunca retorna menos que 1, mesmo com pouquíssimo tempo", () => {
    expect(sessoesPrevistasHoje(0.5)).toBe(1);
  });
});
