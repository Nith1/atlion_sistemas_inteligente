// Sugestões de "lei principal"/"jurisprudência principal" (cronograma à
// parte, ver 0013_lei_principal_disciplina.sql e
// 0018_jurisprudencia_principal_disciplina.sql) por disciplina jurídica —
// mesma ideia de ASSUNTOS_SUGERIDOS, só que aqui o campo é único (a pessoa
// escolhe uma lei pra ler de forma contínua, não várias). Chave = nome
// exato de uma disciplina em DISCIPLINAS_SUGERIDAS.juridica.
export const LEIS_SUGERIDAS: Record<string, string[]> = {
  "Direito Constitucional": ["Constituição Federal"],
  "Direito Administrativo": [
    "Lei nº 8.112/1990 (Regime Jurídico dos Servidores Públicos Civis da União)",
    "Lei nº 9.784/1999 (Processo Administrativo Federal)",
    "Lei nº 8.429/1992 (Improbidade Administrativa)",
    "Lei nº 14.133/2021 (Licitações e Contratos)",
  ],
  "Direito Penal": ["Código Penal"],
  "Direito Civil": ["Código Civil"],
  "Direito Processual Civil": ["Código de Processo Civil"],
  "Direito Processual Penal": ["Código de Processo Penal"],
  "Direito do Trabalho": ["Consolidação das Leis do Trabalho (CLT)"],
  "Direito Tributário": ["Código Tributário Nacional"],
  "Direito Previdenciário": ["Lei nº 8.213/1991 (Planos de Benefícios da Previdência Social)"],
  "Direito Ambiental": ["Lei nº 6.938/1981 (Política Nacional do Meio Ambiente)"],
  "Direito Empresarial": [
    "Código Civil — Livro II (Direito de Empresa)",
    "Lei nº 6.404/1976 (Sociedades por Ações)",
  ],
};

// Jurisprudência não tem "a" fonte única por disciplina como as leis — as
// súmulas mais cobradas em concurso são as mesmas independente da área, por
// isso é uma lista só, reaproveitada em qualquer disciplina jurídica.
export const JURISPRUDENCIA_SUGERIDA: string[] = ["Súmulas do STF", "Súmulas Vinculantes", "Súmulas do STJ"];
