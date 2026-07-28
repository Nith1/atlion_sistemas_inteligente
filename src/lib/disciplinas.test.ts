import { describe, expect, it } from "vitest";
import { inferirTipoDisciplina } from "./disciplinas";

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
