import { describe, expect, it } from "vitest";
import { LIMITE_CRONOMETRO_SEGUNDOS, segundosDesdeComLimite } from "./tempo";

describe("segundosDesdeComLimite", () => {
  it("calcula o tempo decorrido normalmente", () => {
    const inicio = new Date("2026-01-01T10:00:00Z").toISOString();
    const agora = new Date("2026-01-01T10:05:00Z").getTime();
    expect(segundosDesdeComLimite(inicio, agora)).toBe(300);
  });

  it("nunca retorna negativo se o relógio local estiver adiantado", () => {
    const inicio = new Date("2026-01-01T10:05:00Z").toISOString();
    const agora = new Date("2026-01-01T10:00:00Z").getTime();
    expect(segundosDesdeComLimite(inicio, agora)).toBe(0);
  });

  it("trava no teto de segurança quando a etapa fica aberta por horas", () => {
    const inicio = new Date("2026-01-01T00:00:00Z").toISOString();
    const agora = new Date("2026-01-02T00:00:00Z").getTime(); // 24h depois
    expect(segundosDesdeComLimite(inicio, agora)).toBe(LIMITE_CRONOMETRO_SEGUNDOS);
  });
});
