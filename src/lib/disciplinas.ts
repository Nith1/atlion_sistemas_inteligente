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
    "Direito Penal Militar",
    "Direito Processual Penal Militar",
    "Legislação Penal Especial",
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
    "Criminologia",
    "Medicina Legal",
    "Investigação Criminal",
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
    padrao:
      /portugu[eê]s|reda[cç][aã]o|hist[oó]ria|geografia|atualidades|sociologia|filosofia|literatura|criminologia|medicina legal|investiga[çc][ãa]o criminal/i,
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

// Prioridade da disciplina: inclina a escolha da Sessão Adaptativa (ver
// calcularUrgencia abaixo) pra quem quer se dedicar mais a algumas matérias
// do que a outras. "normal" em tudo = comportamento padrão, sem mudança.
export const PRIORIDADES: { valor: "baixa" | "normal" | "alta"; label: string; multiplicador: number }[] = [
  { valor: "baixa", label: "Baixa", multiplicador: 0.6 },
  { valor: "normal", label: "Normal", multiplicador: 1 },
  { valor: "alta", label: "Alta", multiplicador: 1.6 },
];

export type Prioridade = (typeof PRIORIDADES)[number]["valor"];

const MULTIPLICADOR_PRIORIDADE: Record<Prioridade, number> = Object.fromEntries(
  PRIORIDADES.map((p) => [p.valor, p.multiplicador])
) as Record<Prioridade, number>;

// Quão "atrasada" uma disciplina está: tempo desde a última vez estudada (ou
// desde sempre, se nunca foi) multiplicado pela prioridade. É isso que decide
// qual disciplina a Sessão Adaptativa escolhe pra hoje — entre duas igualmente
// atrasadas, a de prioridade mais alta vence a vez primeiro; a de prioridade
// baixa demora mais pra "vencer a vez" mesmo ficando parada por mais tempo.
// O sistema continua decidindo sozinho: a prioridade só inclina a balança.
export function calcularUrgencia(
  ultimaVezEstudada: string | null,
  prioridade: Prioridade,
  agora: Date = new Date()
): number {
  const referencia = ultimaVezEstudada ? new Date(ultimaVezEstudada).getTime() : 0;
  const decorrido = agora.getTime() - referencia;
  return decorrido * MULTIPLICADOR_PRIORIDADE[prioridade];
}
