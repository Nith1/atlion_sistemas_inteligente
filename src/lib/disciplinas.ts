// Sugestões prontas por tipo, usadas no onboarding e no Planejamento pra
// quem prefere escolher em vez de digitar.
export const DISCIPLINAS_SUGERIDAS: Record<string, string[]> = {
  juridica: [
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito Penal",
    "Direito Civil",
    "Direito Processual Civil",
    "Direito Processual Penal",
    "Direito do Trabalho",
    "Direito Tributário",
    "Direito Previdenciário",
    "Direito Ambiental",
    "Direito Empresarial",
  ],
  exatas: ["Matemática", "Raciocínio Lógico", "Estatística", "Matemática Financeira", "Física"],
  humanas: [
    "Língua Portuguesa",
    "Redação",
    "Geografia",
    "História",
    "Atualidades",
    "Direitos Humanos",
    "Sociologia",
    "Filosofia",
  ],
  informatica: [
    "Informática Básica",
    "Segurança da Informação",
    "Redes de Computadores",
    "Banco de Dados",
    "Lógica de Programação",
    "Governança de TI",
  ],
  idiomas: ["Inglês", "Espanhol", "Francês"],
  personalizada: [],
};

const PALAVRAS_CHAVE: { tipo: string; padrao: RegExp }[] = [
  { tipo: "juridica", padrao: /^direito|legisla[cç][aã]o|processual/i },
  { tipo: "exatas", padrao: /matem[aá]tica|racioc[ií]nio l[oó]gico|f[ií]sica|estat[ií]stica|geometria/i },
  {
    tipo: "humanas",
    padrao: /portugu[eê]s|reda[cç][aã]o|hist[oó]ria|geografia|atualidades|sociologia|filosofia|literatura/i,
  },
  { tipo: "informatica", padrao: /inform[aá]tica|tecnologia da informa[cç][aã]o|programa[cç][aã]o|banco de dados|redes de computadores/i },
  { tipo: "idiomas", padrao: /ingl[eê]s|espanhol|franc[eê]s|idioma/i },
];

// Tenta descobrir o tipo da disciplina pelo nome, pra Sessão Adaptativa
// saber que "pipeline" usar mesmo quando o usuário não escolhe o tipo
// manualmente (ex: no onboarding simplificado).
export function inferirTipoDisciplina(nome: string): string {
  const nomeLimpo = nome.trim().toLowerCase();
  if (!nomeLimpo) return "personalizada";

  for (const [tipo, lista] of Object.entries(DISCIPLINAS_SUGERIDAS)) {
    if (lista.some((sugestao) => sugestao.toLowerCase() === nomeLimpo)) return tipo;
  }

  for (const { tipo, padrao } of PALAVRAS_CHAVE) {
    if (padrao.test(nomeLimpo)) return tipo;
  }

  return "personalizada";
}
