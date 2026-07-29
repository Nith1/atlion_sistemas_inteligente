import { describe, expect, it } from "vitest";
import { calcularUrgencia, inferirTipoDisciplina } from "./disciplinas";

describe("inferirTipoDisciplina", () => {
  it("reconhece uma sugestão exata da lista", () => {
    expect(inferirTipoDisciplina("Direito Constitucional")).toBe("juridica");
    expect(inferirTipoDisciplina("Matemática")).toBe("exatas");
  });

  it("infere pelo padrão de palavra-chave quando não é uma sugestão exata", () => {
    expect(inferirTipoDisciplina("Direito Eleitoral")).toBe("juridica");
    expect(inferirTipoDisciplina("Física Básica para Concursos")).toBe("exatas");
    expect(inferirTipoDisciplina("Inglês Instrumental")).toBe("idiomas");
  });

  it("não diferencia maiúsculas/minúsculas nem espaços nas pontas", () => {
    expect(inferirTipoDisciplina("  DIREITO penal  ")).toBe("juridica");
  });

  it("cai em 'personalizada' quando não reconhece nada", () => {
    expect(inferirTipoDisciplina("Xadrez")).toBe("personalizada");
    expect(inferirTipoDisciplina("")).toBe("personalizada");
  });
});

describe("calcularUrgencia", () => {
  const agora = new Date("2026-07-28T12:00:00Z");

  it("com prioridade normal, reproduz o round-robin puro por tempo sem estudar", () => {
    const haUmDia = new Date("2026-07-27T12:00:00Z").toISOString();
    const haDoisDias = new Date("2026-07-26T12:00:00Z").toISOString();

    const urgenciaUmDia = calcularUrgencia(haUmDia, "normal", agora);
    const urgenciaDoisDias = calcularUrgencia(haDoisDias, "normal", agora);

    expect(urgenciaDoisDias).toBeGreaterThan(urgenciaUmDia);
  });

  it("nunca estudada vence qualquer disciplina já estudada, mesmo com prioridade baixa", () => {
    const nuncaEstudada = calcularUrgencia(null, "baixa", agora);
    const estudadaHaAnos = calcularUrgencia(new Date("2020-01-01T00:00:00Z").toISOString(), "alta", agora);

    expect(nuncaEstudada).toBeGreaterThan(estudadaHaAnos);
  });

  it("entre duas igualmente atrasadas, prioridade alta vence a de prioridade baixa", () => {
    const ultimaVez = new Date("2026-07-27T12:00:00Z").toISOString();

    const urgenciaAlta = calcularUrgencia(ultimaVez, "alta", agora);
    const urgenciaBaixa = calcularUrgencia(ultimaVez, "baixa", agora);

    expect(urgenciaAlta).toBeGreaterThan(urgenciaBaixa);
  });
});
