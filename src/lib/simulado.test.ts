import { describe, expect, it } from "vitest";
import { classificarSeveridade, decidirConsequenciasSimulado } from "./simulado";
import { ASSUNTOS_POR_CONSOLIDACAO } from "./janela-ativacao";

describe("classificarSeveridade", () => {
  it("classifica os limiares (30% e 60% são inclusivos)", () => {
    expect(classificarSeveridade(0.29)).toBe("leve");
    expect(classificarSeveridade(0.3)).toBe("moderado");
    expect(classificarSeveridade(0.59)).toBe("moderado");
    expect(classificarSeveridade(0.6)).toBe("grave");
  });
});

describe("decidirConsequenciasSimulado", () => {
  it("tudo leve: nenhuma mudança estrutural", () => {
    const r = decidirConsequenciasSimulado([
      { assuntoId: "a", taxaErro: 0.1 },
      { assuntoId: "b", taxaErro: 0.2 },
    ]);
    expect(r).toEqual({ assuntosParaReestudar: [], disciplina: null });
  });

  it("moderado (sem grave): disciplina sai de Validação e ganha uma Consolidação", () => {
    const r = decidirConsequenciasSimulado([
      { assuntoId: "a", taxaErro: 0.1 },
      { assuntoId: "b", taxaErro: 0.45 },
    ]);
    expect(r).toEqual({
      assuntosParaReestudar: [],
      disciplina: { emValidacao: false, assuntosDesdeConsolidacao: ASSUNTOS_POR_CONSOLIDACAO },
    });
  });

  it("grave: assunto volta a ja_estudado=false, disciplina sai de Validação", () => {
    const r = decidirConsequenciasSimulado([{ assuntoId: "a", taxaErro: 0.7 }]);
    expect(r).toEqual({ assuntosParaReestudar: ["a"], disciplina: { emValidacao: false } });
  });

  it("mistura leve+grave: grave vence — assuntosDesdeConsolidacao não é setado", () => {
    const r = decidirConsequenciasSimulado([
      { assuntoId: "leve", taxaErro: 0.1 },
      { assuntoId: "grave", taxaErro: 0.65 },
    ]);
    expect(r).toEqual({ assuntosParaReestudar: ["grave"], disciplina: { emValidacao: false } });
    expect(r.disciplina && "assuntosDesdeConsolidacao" in r.disciplina).toBe(false);
  });

  it("mistura moderado+grave: grave ainda vence sobre moderado", () => {
    const r = decidirConsequenciasSimulado([
      { assuntoId: "moderado", taxaErro: 0.45 },
      { assuntoId: "grave", taxaErro: 0.8 },
    ]);
    expect(r).toEqual({ assuntosParaReestudar: ["grave"], disciplina: { emValidacao: false } });
  });
});
