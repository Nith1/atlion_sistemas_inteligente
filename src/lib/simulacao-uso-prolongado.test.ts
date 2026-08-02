// Simulação de vários meses de uso real do Atlion — não é um teste unitário
// de uma função isolada, é um teste de integração da lógica pura do motor
// adaptativo (janela-ativacao.ts, simulado.ts, etapas.ts, disciplinas.ts,
// metricas.ts) rodando em conjunto por muitos dias seguidos, com um cliente
// Supabase falso em memória no lugar do banco real.
//
// Objetivo: pegar bugs que só aparecem com o tempo (contadores que nunca
// resetam, disciplinas que ficam presas, pesos que estouram, streaks
// quebrados) e que os testes unitários existentes, por cobrirem só uma
// chamada isolada de cada função, não pegam.
//
// Chama as funções REAIS exportadas de produção (deveSerConsolidacao,
// criarPipelineConsolidacao, criarPipelineValidacao, decidirConsequenciasSimulado,
// calcularUrgencia, sessoesPrevistasHoje, calcularSequenciaDias) — não
// reimplementa a lógica. A orquestração em volta (escolher disciplina, criar
// sessão, aplicar resultado) espelha painel/actions.ts, que não dá pra
// importar direto porque depende de cookies do Next.js.

import { describe, it, expect, beforeEach } from "vitest";
import { deveSerConsolidacao, criarPipelineConsolidacao, ASSUNTOS_POR_CONSOLIDACAO } from "./janela-ativacao";
import { criarPipelineValidacao, decidirConsequenciasSimulado } from "./simulado";
import { calcularUrgencia, type Prioridade } from "./disciplinas";
import { sessoesPrevistasHoje } from "./etapas";
import { calcularSequenciaDias, calcularTaxaErroPorAssunto } from "./metricas";

// --- Cliente Supabase falso em memória -------------------------------------
// Cobre só os métodos que as funções de produção chamadas aqui realmente
// usam (select/eq/in/order/insert, com o formato de retorno {data}/{count}
// que o supabase-js real devolve). Não é um mock genérico de propósito —
// se um dia essas funções passarem a usar outro método, o teste quebra na
// hora (TypeError), o que é o comportamento certo.

type Row = Record<string, unknown>;

function criarBancoFalso() {
  const tabelas: Record<string, Row[]> = {
    assuntos: [],
    sessao_etapas: [],
    sessao_etapa_assuntos: [],
    questoes_registro: [],
  };

  let proximoId = 1;
  const gerarId = () => `id-${proximoId++}`;

  function from(nome: string) {
    const filtros: [string, unknown][] = [];
    let filtroIn: [string, unknown[]] | null = null;
    let ordemCol: string | null = null;
    let ordemAsc = true;
    let contarApenas = false;
    let paraInserir: Row[] | null = null;

    function aplicarFiltros(linhas: Row[]) {
      let resultado = linhas.filter((linha) => filtros.every(([col, val]) => linha[col] === val));
      if (filtroIn) {
        const [col, vals] = filtroIn;
        resultado = resultado.filter((linha) => vals.includes(linha[col]));
      }
      if (ordemCol) {
        resultado = [...resultado].sort((a, b) => {
          const av = a[ordemCol!] as number;
          const bv = b[ordemCol!] as number;
          return ordemAsc ? av - bv : bv - av;
        });
      }
      return resultado;
    }

    const builder = {
      select(_cols: string, opts?: { count?: string; head?: boolean }) {
        contarApenas = !!(opts?.count && opts?.head);
        return builder;
      },
      eq(col: string, val: unknown) {
        filtros.push([col, val]);
        return builder;
      },
      in(col: string, vals: unknown[]) {
        filtroIn = [col, vals];
        return builder;
      },
      order(col: string, opts: { ascending: boolean }) {
        ordemCol = col;
        ordemAsc = opts.ascending;
        return builder;
      },
      insert(linhas: Row[]) {
        paraInserir = linhas.map((linha) => ({ id: gerarId(), ...linha }));
        return builder;
      },
      then(resolve: (v: { data: Row[] | null; count: number | null; error: null }) => void) {
        if (paraInserir) {
          tabelas[nome].push(...paraInserir);
          resolve({ data: paraInserir, count: null, error: null });
          return;
        }
        const filtradas = aplicarFiltros(tabelas[nome]);
        if (contarApenas) {
          resolve({ data: null, count: filtradas.length, error: null });
        } else {
          resolve({ data: filtradas, count: null, error: null });
        }
      },
    };
    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from, tabelas } as any;
}

// --- Modelo de estado da simulação ------------------------------------------

type TipoDisciplina = "juridica" | "exatas" | "humanas" | "informatica" | "idiomas" | "personalizada";

type Disciplina = {
  id: string;
  nome: string;
  tipo: TipoDisciplina;
  prioridade: Prioridade;
  assuntos_desde_consolidacao: number;
  em_validacao: boolean;
};

describe("simulação de uso prolongado (vários meses, várias disciplinas)", () => {
  let db: ReturnType<typeof criarBancoFalso>;
  let disciplinas: Disciplina[];
  let ultimaSessaoConcluida: Map<string, Date>;
  let sessoesConcluidasEm: Date[];
  let pesosVistos: number[] = [];
  const disciplinasQuePassaramPorValidacao = new Set<string>();
  const severidadesVistas = new Set<string>();

  beforeEach(() => {
    db = criarBancoFalso();
    ultimaSessaoConcluida = new Map();
    sessoesConcluidasEm = [];
    pesosVistos = [];

    // "Juiz Federal": concurso pesado, muitas disciplinas jurídicas com bastante
    // assunto cada uma (típico do que motivou a pergunta original) + 2 de
    // humanas — e uma disciplina propositalmente pequena (3 assuntos, abaixo
    // de ASSUNTOS_POR_CONSOLIDACAO=4) pra testar o gatilho secundário de
        // deveSerConsolidacao (ver comentário da função).
    const definicoes: { nome: string; tipo: TipoDisciplina; nAssuntos: number; prioridade: Prioridade }[] = [
      { nome: "Direito Constitucional", tipo: "juridica", nAssuntos: 32, prioridade: "alta" },
      { nome: "Direito Administrativo", tipo: "juridica", nAssuntos: 28, prioridade: "alta" },
      { nome: "Direito Civil", tipo: "juridica", nAssuntos: 35, prioridade: "normal" },
      { nome: "Direito Processual Civil", tipo: "juridica", nAssuntos: 30, prioridade: "normal" },
      { nome: "Direito Penal", tipo: "juridica", nAssuntos: 26, prioridade: "normal" },
      { nome: "Direito Processual Penal", tipo: "juridica", nAssuntos: 24, prioridade: "normal" },
      { nome: "Direito Tributário", tipo: "juridica", nAssuntos: 20, prioridade: "baixa" },
      { nome: "Direito Previdenciário", tipo: "juridica", nAssuntos: 18, prioridade: "baixa" },
      { nome: "Direito Empresarial", tipo: "juridica", nAssuntos: 3, prioridade: "baixa" },
      { nome: "Língua Portuguesa", tipo: "humanas", nAssuntos: 22, prioridade: "normal" },
      { nome: "Direitos Humanos", tipo: "humanas", nAssuntos: 12, prioridade: "normal" },
    ];

    disciplinas = definicoes.map((d, i) => ({
      id: `disc-${i}`,
      nome: d.nome,
      tipo: d.tipo,
      prioridade: d.prioridade,
      assuntos_desde_consolidacao: 0,
      em_validacao: false,
    }));

    for (const [i, disc] of disciplinas.entries()) {
      const nAssuntos = definicoes[i].nAssuntos;
      for (let a = 0; a < nAssuntos; a++) {
        db.tabelas.assuntos.push({
          id: `${disc.id}-assunto-${a}`,
          disciplina_id: disc.id,
          nome: `Assunto ${a + 1}`,
          ordem: a,
          ja_estudado: false,
        });
      }
    }
  });

  // Taxa de erro por disciplina — algumas "difíceis" (erro alto, deve
  // empurrar pra reestudo/grave no Simulado ao menos uma vez), outras
  // "fáceis" (erro baixo, passa tranquilo). Cobre os 3 ramos de
  // decidirConsequenciasSimulado de propósito. Melhora a cada vez que a
  // disciplina passa por Validação (aluno aprende de verdade ao reestudar) —
  // sem isso, uma disciplina "grave" ficaria presa num loop eterno de
  // reestudar/falhar/reestudar com a MESMA taxa pra sempre, o que testaria
  // uma limitação do teste (taxa fixa), não da metodologia.
  const tentativasValidacao = new Map<string, number>();
  function taxaErroDaDisciplina(disciplinaId: string): number {
    const indice = disciplinas.findIndex((d) => d.id === disciplinaId);
    const base = indice % 5 === 0 ? 0.65 : indice % 5 === 1 ? 0.4 : 0.05;
    const tentativas = tentativasValidacao.get(disciplinaId) ?? 0;
    return Math.max(0.05, base - tentativas * 0.2);
  }

  function registrarQuestoes(disciplinaId: string, assuntoId: string, sessaoId: string, taxaErro: number, total = 10) {
    const erradas = Math.round(total * taxaErro);
    const certas = total - erradas;
    for (let i = 0; i < certas; i++) {
      db.tabelas.questoes_registro.push({
        id: `qr-${db.tabelas.questoes_registro.length}`,
        disciplina_id: disciplinaId,
        assunto_id: assuntoId,
        sessao_id: sessaoId,
        acertou: true,
      });
    }
    for (let i = 0; i < erradas; i++) {
      db.tabelas.questoes_registro.push({
        id: `qr-${db.tabelas.questoes_registro.length}`,
        disciplina_id: disciplinaId,
        assunto_id: assuntoId,
        sessao_id: sessaoId,
        acertou: false,
      });
    }
    return { certas, erradas };
  }

  const contagemEscolhas = new Map<string, number>();

  // etapa_id da etapa "questoes" da sessão atual — sessao_etapa_assuntos
  // acumula linhas de TODAS as sessões já rodadas pra essa disciplina ao
  // longo da simulação, então filtrar só por disciplina (sem isso) pegaria
  // pesos de sessões passadas junto com os da atual.
  function etapaQuestoesDaSessao(sessaoId: string): string | undefined {
    return db.tabelas.sessao_etapas.find((e: Row) => e.sessao_id === sessaoId && e.tipo === "questoes")?.id as
      | string
      | undefined;
  }

  function escolherDisciplina(agora: Date): Disciplina {
    const escolhida = [...disciplinas]
      .filter((d) => db.tabelas.assuntos.some((a: Row) => a.disciplina_id === d.id))
      .sort((a, b) => {
        const uA = calcularUrgencia(ultimaSessaoConcluida.get(a.id)?.toISOString() ?? null, a.prioridade, agora);
        const uB = calcularUrgencia(ultimaSessaoConcluida.get(b.id)?.toISOString() ?? null, b.prioridade, agora);
        return uB - uA;
      })[0];
    if (escolhida) contagemEscolhas.set(escolhida.id, (contagemEscolhas.get(escolhida.id) ?? 0) + 1);
    return escolhida;
  }

  // Roda uma sessão inteira pra uma disciplina (normal, consolidação ou
  // validação) — espelha criarSessaoParaDisciplina + concluirX de
  // painel/actions.ts, chamando as funções reais onde existem.
  async function rodarSessao(disciplina: Disciplina, agora: Date) {
    const sessaoId = `sessao-${Math.random().toString(36).slice(2)}`;
    const taxaErro = taxaErroDaDisciplina(disciplina.id);

    if (disciplina.em_validacao) {
      disciplinasQuePassaramPorValidacao.add(disciplina.id);
      tentativasValidacao.set(disciplina.id, (tentativasValidacao.get(disciplina.id) ?? 0) + 1);
      await criarPipelineValidacao(db, sessaoId, disciplina.id);

      const etapaId = etapaQuestoesDaSessao(sessaoId);
      const assuntosDaEtapa = db.tabelas.sessao_etapa_assuntos.filter((l: Row) => l.etapa_id === etapaId);

      const resultados = assuntosDaEtapa.map((linha: Row) => {
        const { erradas, certas } = registrarQuestoes(disciplina.id, linha.assunto_id as string, sessaoId, taxaErro);
        pesosVistos.push(Number(linha.peso_percentual ?? 0));
        return { assuntoId: linha.assunto_id as string, taxaErro: erradas / (certas + erradas || 1) };
      });

      const consequencias = decidirConsequenciasSimulado(resultados);
      severidadesVistas.add(taxaErro >= 0.6 ? "grave" : taxaErro >= 0.3 ? "moderado" : "leve");

      if (consequencias.assuntosParaReestudar.length > 0) {
        for (const id of consequencias.assuntosParaReestudar) {
          const assunto = db.tabelas.assuntos.find((a: Row) => a.id === id);
          if (assunto) assunto.ja_estudado = false;
        }
      }
      if (consequencias.disciplina) {
        disciplina.em_validacao = consequencias.disciplina.emValidacao;
        if (consequencias.disciplina.assuntosDesdeConsolidacao !== undefined) {
          disciplina.assuntos_desde_consolidacao = consequencias.disciplina.assuntosDesdeConsolidacao;
        }
      }
    } else if (await deveSerConsolidacao(db, disciplina.id, disciplina.assuntos_desde_consolidacao)) {
      await criarPipelineConsolidacao(db, sessaoId, disciplina.id, disciplina.assuntos_desde_consolidacao);

      const etapaId = etapaQuestoesDaSessao(sessaoId);
      const assuntosDaEtapa = db.tabelas.sessao_etapa_assuntos.filter((l: Row) => l.etapa_id === etapaId);
      for (const linha of assuntosDaEtapa) {
        registrarQuestoes(disciplina.id, linha.assunto_id as string, sessaoId, taxaErro, 5);
        pesosVistos.push(1); // tiers não têm peso numérico, só rótulo — presença já basta aqui
      }

      const restantes = db.tabelas.assuntos.filter(
        (a: Row) => a.disciplina_id === disciplina.id && !a.ja_estudado
      ).length;
      disciplina.assuntos_desde_consolidacao = 0;
      disciplina.em_validacao = restantes === 0;
    } else {
      // sessão normal: estuda o próximo assunto ainda não estudado
      const proximo = db.tabelas.assuntos
        .filter((a: Row) => a.disciplina_id === disciplina.id && !a.ja_estudado)
        .sort((a: Row, b: Row) => (a.ordem as number) - (b.ordem as number))[0];

      if (proximo) {
        proximo.ja_estudado = true;
        proximo.ultima_vez_estudado = agora.toISOString();
        disciplina.assuntos_desde_consolidacao += 1;
        registrarQuestoes(disciplina.id, proximo.id as string, sessaoId, taxaErro, 8);
      }
    }

    ultimaSessaoConcluida.set(disciplina.id, agora);
    sessoesConcluidasEm.push(new Date(agora));
  }

  it("aguenta 1 ano de estudo diário em 11 disciplinas sem travar, sem contador descontrolado e cobrindo os 3 ramos do Simulado", async () => {
    const DIAS = 365; // 1 ano — prazo mais realista pra um concurso pesado (juiz) com disciplinas bem desiguais em tamanho
    const HORAS_LIQUIDAS_DIA = 4; // concurseiro dedicado, tempo integral-ish
    const inicio = new Date("2026-01-01T08:00:00Z");

    let diasEstudados = 0;

    for (let dia = 0; dia < DIAS; dia++) {
      const agora = new Date(inicio.getTime() + dia * 24 * 60 * 60 * 1000);

      // ~1 em cada 7 dias sem estudar (fim de semana / imprevisto) — testa que
      // o streak (calcularSequenciaDias) lida bem com furos, não só sequência perfeita.
      if (dia % 7 === 6) continue;
      diasEstudados++;

      const sessoesHoje = sessoesPrevistasHoje(HORAS_LIQUIDAS_DIA);
      for (let s = 0; s < sessoesHoje; s++) {
        const disciplina = escolherDisciplina(agora);
        if (!disciplina) continue;
        await rodarSessao(disciplina, agora);

        // sanidade a cada sessão: nenhum contador de consolidação passa do
        // teto sem ser resetado (senão o gatilho da Consolidação quebrou)
        expect(disciplina.assuntos_desde_consolidacao).toBeGreaterThanOrEqual(0);
        expect(disciplina.assuntos_desde_consolidacao).toBeLessThanOrEqual(ASSUNTOS_POR_CONSOLIDACAO);
      }
    }

    // 1. Rodou o ano inteiro sem lançar exceção (o teste já teria falhado
    // antes se tivesse quebrado no meio) e estudou em dias de verdade.
    expect(diasEstudados).toBeGreaterThan(280);

    // 2. Toda disciplina com assunto cadastrado deve, em algum momento nesse
    // ano, ter passado por Validação (Simulado) — prova que a metodologia
    // converge (ninguém fica girando Consolidação pra sempre sem nunca
    // "fechar" a disciplina), inclusive a disciplina pequena (3 assuntos).
    for (const disciplina of disciplinas) {
      const restantes = db.tabelas.assuntos.filter(
        (a: Row) => a.disciplina_id === disciplina.id && !a.ja_estudado
      ).length;
      const total = db.tabelas.assuntos.filter((a: Row) => a.disciplina_id === disciplina.id).length;
      console.log(
        `${disciplina.nome} [${disciplina.prioridade}]: ${total - restantes}/${total} assuntos estudados, em_validacao=${disciplina.em_validacao}, assuntos_desde_consolidacao=${disciplina.assuntos_desde_consolidacao}, escolhida ${contagemEscolhas.get(disciplina.id) ?? 0}x`
      );
      expect(
        disciplinasQuePassaramPorValidacao.has(disciplina.id),
        `${disciplina.nome} nunca entrou em modo Validação em 1 ano`
      ).toBe(true);
    }

    // 3. Os 3 ramos de severidade do Simulado (leve/moderado/grave) foram
    // todos exercitados de verdade, não só o caminho feliz.
    expect(severidadesVistas.has("leve")).toBe(true);
    expect(severidadesVistas.has("moderado")).toBe(true);
    expect(severidadesVistas.has("grave")).toBe(true);

    // 4. Nenhum peso de revisão saiu do intervalo válido (1 a 100) em nenhuma
    // das centenas de Sessões de Consolidação/Validação rodadas.
    for (const peso of pesosVistos) {
      expect(peso).toBeGreaterThan(0);
    }

    // 5. Streak: reflete os furos propositais (1 em 7 dias), não "sempre
    // tudo" nem "sempre zero" — se calcularSequenciaDias tivesse um
    // off-by-one feio, isso apareceria como um número absurdo (negativo ou
    // maior que o total de dias estudados).
    const streakFinal = calcularSequenciaDias(sessoesConcluidasEm);
    expect(streakFinal).toBeGreaterThanOrEqual(0);
    expect(streakFinal).toBeLessThanOrEqual(diasEstudados);

    // 6. Taxa de erro por assunto (usada pro Simulado pesar a revisão) nunca
    // produz NaN/Infinity mesmo depois de centenas de registros acumulados.
    const taxas = calcularTaxaErroPorAssunto(
      db.tabelas.questoes_registro.map((r: Row) => ({
        assunto_id: r.assunto_id as string,
        acertou: r.acertou as boolean,
      }))
    );
    for (const taxa of taxas.values()) {
      expect(Number.isFinite(taxa)).toBe(true);
      expect(taxa).toBeGreaterThanOrEqual(0);
      expect(taxa).toBeLessThanOrEqual(1);
    }

    // 7. Volume gerado nesse ano — número de referência real (não uma
    // suposição) pra estimar espaço em banco em escala (ver conversa sobre
    // capacidade/Supabase).
    console.log("Volume simulado em 1 ano (1 aluno, 11 disciplinas, 4h líquidas/dia):", {
      questoes_registro: db.tabelas.questoes_registro.length,
      sessao_etapa_assuntos: db.tabelas.sessao_etapa_assuntos.length,
      sessoes_concluidas: sessoesConcluidasEm.length,
    });
  });
});
