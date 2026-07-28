export type Topico = { nivel: number; nome: string };

function limparLinha(linha: string): string {
  return linha
    .trim()
    .replace(/^[-•*]\s+/, "")
    .replace(/^\d+(\.\d+)*\.?\s+/, "")
    .replace(/\.\s*$/, "")
    .trim();
}

// Padrão de início de tópico de edital: "1 ", "1.1 ", "4. " etc. seguido de
// maiúscula — exigir maiúscula evita separar em falso em citações tipo "art. 37".
const INICIO_TOPICO = /\d+(?:\.\d+)*\.?\s+[A-ZÀ-Ú]/;

// Quebra um bloco de texto (já sem quebras de linha internas) em tópicos
// separados, a cada ocorrência de ". N " / ". N.N " / ". N. " etc.
function explodirTopicosDeEdital(texto: string): string[] {
  const partes = texto.split(new RegExp(`(?<=\\.)\\s+(?=${INICIO_TOPICO.source})`));
  return partes.length > 1 ? partes : [texto];
}

// Quebra um bloco de texto colado (edital, índice de livro, lista simples) em
// tópicos com nível de hierarquia — a profundidade da numeração ("1" → nível
// 1, "1.1" → nível 2, "1.1.1" → nível 3...) vira profundidade de sub-assunto.
// Usado tanto no "colar em lote" de Planejamento quanto no onboarding.
export function extrairTopicos(texto: string): Topico[] {
  // Editais colados (principalmente copiados de PDF) costumam ter quebra de
  // linha no meio da frase — é assim que a camada de texto do PDF reflui,
  // não tem relação com onde um tópico termina. Se o texto tem várias
  // ocorrências de numeração de tópico, tratamos tudo como um parágrafo só
  // (juntando as linhas) e separamos pela numeração, não pela quebra de linha.
  const ocorrenciasDeTopico = (texto.match(new RegExp(INICIO_TOPICO, "g")) ?? []).length;

  const blocos =
    ocorrenciasDeTopico >= 2
      ? explodirTopicosDeEdital(
          texto
            .replace(/\s*\n\s*/g, " ")
            .replace(/^[A-ZÀ-Ú][A-ZÀ-Ú\s()/-]{2,}:\s*/, "")
        )
      : texto.split("\n");

  return blocos
    .map((trecho) => {
      const bruto = trecho.trim();
      const numeracao = bruto.match(/^(\d+(?:\.\d+)*)\.?\s+/);
      const nivel = numeracao ? numeracao[1].split(".").length : 1;
      return { nivel, nome: limparLinha(bruto) };
    })
    .filter((topico) => topico.nome.length > 0);
}
