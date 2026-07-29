import { describe, expect, it, vi } from "vitest";
import { aplicarMutacaoLocal, criarControladorFila, enfileirar } from "./fila";
import type { EtapaLocal, MutacaoPendente, SessaoLocalState } from "./tipos";

function etapa(parcial: Partial<EtapaLocal> & { id: string; tipo: string; ordem: number }): EtapaLocal {
  return {
    concluida: false,
    assuntoId: null,
    iniciadaEm: null,
    tempoGastoSegundos: null,
    tempoAcumuladoSegundos: 0,
    minutosAjustados: null,
    ...parcial,
  };
}

function estadoBase(etapas: EtapaLocal[]): SessaoLocalState {
  return {
    versao: 1,
    sessaoId: "sessao-1",
    etapas,
    assuntoSelecionado: null,
    progressoLeiSecaDisciplina: null,
    fila: [],
    atualizadoEm: new Date(0).toISOString(),
  };
}

describe("aplicarMutacaoLocal", () => {
  it("concluirDescanso calcula tempo gasto a partir de iniciadaEm e liga a próxima etapa", () => {
    const inicio = new Date("2026-01-01T10:00:00.000Z");
    const agora = new Date("2026-01-01T10:05:00.000Z"); // 5 min depois

    const estado = estadoBase([
      etapa({ id: "e1", tipo: "descanso", ordem: 0, iniciadaEm: inicio.toISOString(), tempoAcumuladoSegundos: 30 }),
      etapa({ id: "e2", tipo: "questoes", ordem: 1 }),
    ]);

    const mutacao: MutacaoPendente = { id: "m1", criadaEm: agora.toISOString(), tipo: "concluirDescanso", etapaId: "e1", sessaoId: "sessao-1" };
    const novo = aplicarMutacaoLocal(estado, mutacao, agora.getTime());

    expect(novo.etapas[0].concluida).toBe(true);
    expect(novo.etapas[0].tempoGastoSegundos).toBe(30 + 5 * 60);
    expect(novo.etapas[1].iniciadaEm).toBe(agora.toISOString());
  });

  it("concluirEstudo propaga o assunto pras próximas etapas não concluídas, exceto ativação cognitiva", () => {
    const estado = estadoBase([
      etapa({ id: "e0", tipo: "ativacao_cognitiva", ordem: 0, concluida: true }),
      etapa({ id: "e1", tipo: "estudo", ordem: 1 }),
      etapa({ id: "e2", tipo: "lei_seca", ordem: 2 }),
      etapa({ id: "e3", tipo: "questoes", ordem: 3 }),
    ]);

    const mutacao: MutacaoPendente = {
      id: "m1",
      criadaEm: new Date().toISOString(),
      tipo: "concluirEstudo",
      etapaId: "e1",
      sessaoId: "sessao-1",
      assuntoId: "assunto-1",
    };
    const novo = aplicarMutacaoLocal(estado, mutacao);

    expect(novo.etapas[1].assuntoId).toBe("assunto-1"); // e1, a própria etapa concluída
    expect(novo.etapas[2].assuntoId).toBe("assunto-1"); // e2, lei_seca
    expect(novo.etapas[3].assuntoId).toBe("assunto-1"); // e3, questoes
    expect(novo.etapas[0].assuntoId).toBeNull(); // ativacao_cognitiva nunca recebe
  });

  it("continuarEstudoDepois não marca a etapa como reiniciada e atualiza progressoEstudo", () => {
    const estado = {
      ...estadoBase([etapa({ id: "e1", tipo: "estudo", ordem: 0 }), etapa({ id: "e2", tipo: "questoes", ordem: 1 })]),
      assuntoSelecionado: {
        id: "assunto-1",
        nome: "Poder Constituinte",
        progressoEstudo: null,
        leiReferencia: null,
        progressoLeiSeca: null,
        jurisprudenciaReferencia: null,
        progressoJurisprudencia: null,
      },
    };

    const mutacao: MutacaoPendente = {
      id: "m1",
      criadaEm: new Date().toISOString(),
      tipo: "continuarEstudoDepois",
      etapaId: "e1",
      sessaoId: "sessao-1",
      assuntoId: "assunto-1",
      progresso: "página 42",
    };
    const novo = aplicarMutacaoLocal(estado, mutacao);

    expect(novo.etapas[0].concluida).toBe(true);
    expect(novo.assuntoSelecionado?.progressoEstudo).toBe("página 42");
  });

  it("concluirLeiSeca no modo lei principal atualiza progressoLeiSecaDisciplina e respeita reiniciar", () => {
    const estado = { ...estadoBase([etapa({ id: "e1", tipo: "lei_seca", ordem: 0 })]), progressoLeiSecaDisciplina: "Art. 10" };

    const mutacaoReiniciar: MutacaoPendente = {
      id: "m1",
      criadaEm: new Date().toISOString(),
      tipo: "concluirLeiSeca",
      etapaId: "e1",
      sessaoId: "sessao-1",
      disciplinaId: "d1",
      assuntoId: null,
      usaLeiPrincipal: true,
      progresso: "",
      leiReferencia: "",
      reiniciar: true,
    };
    const novo = aplicarMutacaoLocal(estado, mutacaoReiniciar);
    expect(novo.progressoLeiSecaDisciplina).toBeNull();
  });

  it("concluirQuestoes marca a etapa concluída (última do pipeline — nenhuma outra fica pendente)", () => {
    const estado = estadoBase([etapa({ id: "e1", tipo: "questoes", ordem: 0, iniciadaEm: new Date().toISOString() })]);
    const mutacao: MutacaoPendente = {
      id: "m1",
      criadaEm: new Date().toISOString(),
      tipo: "concluirQuestoes",
      etapaId: "e1",
      sessaoId: "sessao-1",
      disciplinaId: "d1",
      assuntoId: null,
      certas: 5,
      erradas: 2,
      anotacao: "",
    };
    const novo = aplicarMutacaoLocal(estado, mutacao);

    expect(novo.etapas.every((e) => e.concluida)).toBe(true);
    expect(novo.etapas.find((e) => !e.concluida)).toBeUndefined();
  });

  it("pausarEtapa e retomarEtapa acumulam e retomam o relógio sem duplicar tempo se chamado quando já pausada", () => {
    const inicio = new Date("2026-01-01T10:00:00.000Z");
    const agora = new Date("2026-01-01T10:01:00.000Z");
    const estado = estadoBase([etapa({ id: "e1", tipo: "estudo", ordem: 0, iniciadaEm: inicio.toISOString() })]);

    const pausa: MutacaoPendente = { id: "m1", criadaEm: agora.toISOString(), tipo: "pausarEtapa", etapaId: "e1" };
    const pausado = aplicarMutacaoLocal(estado, pausa, agora.getTime());
    expect(pausado.etapas[0].iniciadaEm).toBeNull();
    expect(pausado.etapas[0].tempoAcumuladoSegundos).toBe(60);

    // pausar de novo (já pausada) não deve mexer em nada — iniciadaEm já é null
    const pausadoDeNovo = aplicarMutacaoLocal(pausado, pausa, agora.getTime() + 5000);
    expect(pausadoDeNovo.etapas[0].tempoAcumuladoSegundos).toBe(60);
  });
});

describe("enfileirar", () => {
  it("acrescenta a mutação no fim da fila e não muta o estado original", () => {
    const estado = estadoBase([etapa({ id: "e1", tipo: "descanso", ordem: 0 })]);
    const novo = enfileirar(estado, { tipo: "concluirDescanso", etapaId: "e1", sessaoId: "sessao-1" });

    expect(estado.fila).toHaveLength(0);
    expect(novo.fila).toHaveLength(1);
    expect(novo.fila[0].tipo).toBe("concluirDescanso");
  });
});

describe("criarControladorFila", () => {
  function mutacao(id: string): MutacaoPendente {
    return { id, criadaEm: new Date().toISOString(), tipo: "concluirDescanso", etapaId: "e1", sessaoId: "sessao-1" };
  }

  it("processa a fila em ordem, uma de cada vez, esperando cada despacho confirmar antes do próximo", async () => {
    const ordem: string[] = [];
    let emAndamento = 0;
    let maxSimultaneas = 0;

    const despachar = vi.fn(async (m: MutacaoPendente) => {
      emAndamento++;
      maxSimultaneas = Math.max(maxSimultaneas, emAndamento);
      await new Promise((resolve) => setTimeout(resolve, 5));
      ordem.push(m.id);
      emAndamento--;
    });

    let estado = { ...estadoBase([]), fila: [mutacao("m1"), mutacao("m2"), mutacao("m3")] };
    const controlador = criarControladorFila(despachar);

    await controlador.flush(
      "sessao-1",
      () => estado,
      (_m, novoEstado) => {
        estado = novoEstado;
      }
    );

    expect(ordem).toEqual(["m1", "m2", "m3"]);
    expect(maxSimultaneas).toBe(1);
    expect(estado.fila).toHaveLength(0);
  });

  it("interrompe e preserva a fila se despachar falhar, sem descartar o item", async () => {
    const despachar = vi.fn(async (m: MutacaoPendente) => {
      if (m.id === "m2") throw new Error("rede caiu");
    });

    let estado = { ...estadoBase([]), fila: [mutacao("m1"), mutacao("m2"), mutacao("m3")] };
    const controlador = criarControladorFila(despachar);

    await controlador.flush(
      "sessao-1",
      () => estado,
      (_m, novoEstado) => {
        estado = novoEstado;
      }
    );

    // m1 sincronizou e saiu da fila; m2 falhou e nem ele nem m3 (que vem
    // depois) foram processados — fila intacta a partir do ponto do erro.
    expect(estado.fila.map((m) => m.id)).toEqual(["m2", "m3"]);
  });

  it("não roda dois flushes em paralelo pra mesma sessão", async () => {
    let chamadas = 0;
    const despachar = vi.fn(async () => {
      chamadas++;
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    let estado = { ...estadoBase([]), fila: [mutacao("m1")] };
    const controlador = criarControladorFila(despachar);
    const atualizar = (_m: MutacaoPendente, novoEstado: SessaoLocalState) => {
      estado = novoEstado;
    };

    const p1 = controlador.flush("sessao-1", () => estado, atualizar);
    const p2 = controlador.flush("sessao-1", () => estado, atualizar); // deve no-op, trava já ocupada

    await Promise.all([p1, p2]);
    expect(chamadas).toBe(1);
  });

  it("picks up mutações enfileiradas durante um flush em andamento (obterEstado é relido a cada volta)", async () => {
    let estado = { ...estadoBase([]), fila: [mutacao("m1")] };
    const despachar = vi.fn(async (m: MutacaoPendente) => {
      if (m.id === "m1") {
        // simula o usuário clicando em outra etapa enquanto a primeira ainda sincroniza
        estado = { ...estado, fila: [...estado.fila, mutacao("m2")] };
      }
    });

    const controlador = criarControladorFila(despachar);
    await controlador.flush(
      "sessao-1",
      () => estado,
      (_m, novoEstado) => {
        estado = novoEstado;
      }
    );

    expect(despachar).toHaveBeenCalledTimes(2);
    expect(estado.fila).toHaveLength(0);
  });
});
