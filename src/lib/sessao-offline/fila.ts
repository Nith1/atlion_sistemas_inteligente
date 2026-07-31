import { segundosDesdeComLimite } from "@/lib/tempo";
import type { EtapaLocal, MutacaoPendente, MutacaoSemId, SessaoLocalState } from "./tipos";

function gerarId(): string {
  return crypto.randomUUID();
}

// Espelha avancarEtapa() de sessao/actions.ts: fecha a etapa (calcula tempo
// gasto a partir do que já tava acumulado + o que rodou desde iniciadaEm) e
// liga o relógio da próxima etapa não concluída, se ela ainda não tiver
// começado. `assuntoId === undefined` significa "não mexe nesse campo" —
// só concluirEstudo/continuarEstudoDepois/concluirQuestoes passam um valor.
function concluirEtapaLocal(
  estado: SessaoLocalState,
  etapaId: string,
  assuntoId: string | null | undefined,
  agoraMs: number
): SessaoLocalState {
  const etapas: EtapaLocal[] = estado.etapas.map((e) => {
    if (e.id !== etapaId || e.concluida) return e;
    const decorrido = e.iniciadaEm ? segundosDesdeComLimite(e.iniciadaEm, agoraMs) : 0;
    return {
      ...e,
      ...(assuntoId !== undefined ? { assuntoId } : {}),
      concluida: true,
      tempoGastoSegundos: e.tempoAcumuladoSegundos + decorrido,
    };
  });

  const proximaIndex = etapas.findIndex((e) => !e.concluida);
  if (proximaIndex !== -1 && !etapas[proximaIndex].iniciadaEm) {
    etapas[proximaIndex] = { ...etapas[proximaIndex], iniciadaEm: new Date(agoraMs).toISOString() };
  }

  return { ...estado, etapas, atualizadoEm: new Date(agoraMs).toISOString() };
}

// Espelha a propagação que concluirEstudo/continuarEstudoDepois fazem no
// servidor: o assunto do dia passa a valer pras próximas etapas da sessão
// (lei seca, jurisprudência, questões...), exceto ativação cognitiva.
function propagarAssunto(etapas: EtapaLocal[], assuntoId: string | null): EtapaLocal[] {
  if (!assuntoId) return etapas;
  return etapas.map((e) => (e.tipo !== "ativacao_cognitiva" && !e.concluida ? { ...e, assuntoId } : e));
}

// Aplica uma mutação otimisticamente no estado local — é o que faz a tela
// avançar na hora, sem esperar o servidor, seja online ou offline. Mantém
// a mesma lógica de negócio que as Server Actions em sessao/actions.ts,
// só que em memória.
export function aplicarMutacaoLocal(
  estado: SessaoLocalState,
  mutacao: MutacaoPendente,
  agoraMs: number = Date.now()
): SessaoLocalState {
  switch (mutacao.tipo) {
    case "pausarEtapa": {
      const etapas = estado.etapas.map((e) => {
        if (e.id !== mutacao.etapaId || !e.iniciadaEm) return e;
        const decorrido = segundosDesdeComLimite(e.iniciadaEm, agoraMs);
        return { ...e, tempoAcumuladoSegundos: e.tempoAcumuladoSegundos + decorrido, iniciadaEm: null };
      });
      return { ...estado, etapas, atualizadoEm: new Date(agoraMs).toISOString() };
    }

    case "retomarEtapa": {
      const etapas = estado.etapas.map((e) =>
        e.id === mutacao.etapaId ? { ...e, iniciadaEm: new Date(agoraMs).toISOString() } : e
      );
      return { ...estado, etapas, atualizadoEm: new Date(agoraMs).toISOString() };
    }

    case "concluirAtivacaoCognitiva":
    case "concluirDescanso":
    case "concluirConsolidacao":
    case "concluirRevisaoErros":
      return concluirEtapaLocal(estado, mutacao.etapaId, undefined, agoraMs);

    case "concluirEstudo": {
      const etapas = propagarAssunto(estado.etapas, mutacao.assuntoId);
      return concluirEtapaLocal({ ...estado, etapas }, mutacao.etapaId, mutacao.assuntoId, agoraMs);
    }

    case "continuarEstudoDepois": {
      const etapas = propagarAssunto(estado.etapas, mutacao.assuntoId);
      const assuntoSelecionado =
        estado.assuntoSelecionado && mutacao.assuntoId === estado.assuntoSelecionado.id
          ? { ...estado.assuntoSelecionado, progressoEstudo: mutacao.progresso || null }
          : estado.assuntoSelecionado;
      return concluirEtapaLocal(
        { ...estado, etapas, assuntoSelecionado },
        mutacao.etapaId,
        mutacao.assuntoId,
        agoraMs
      );
    }

    case "concluirLeiSeca": {
      let progressoLeiSecaDisciplina = estado.progressoLeiSecaDisciplina;
      let assuntoSelecionado = estado.assuntoSelecionado;

      if (mutacao.usaLeiPrincipal) {
        progressoLeiSecaDisciplina = mutacao.reiniciar ? null : mutacao.progresso.trim() || progressoLeiSecaDisciplina;
      } else if (mutacao.assuntoId && assuntoSelecionado?.id === mutacao.assuntoId) {
        assuntoSelecionado = {
          ...assuntoSelecionado,
          ...(mutacao.leiReferencia.trim() ? { leiReferencia: mutacao.leiReferencia.trim() } : {}),
          ...(mutacao.progresso.trim() ? { progressoLeiSeca: mutacao.progresso.trim() } : {}),
        };
      }

      return concluirEtapaLocal(
        { ...estado, progressoLeiSecaDisciplina, assuntoSelecionado },
        mutacao.etapaId,
        undefined,
        agoraMs
      );
    }

    case "concluirJurisprudencia": {
      let progressoJurisprudenciaDisciplina = estado.progressoJurisprudenciaDisciplina;
      let assuntoSelecionado = estado.assuntoSelecionado;

      if (mutacao.usaJurisprudenciaPrincipal) {
        progressoJurisprudenciaDisciplina = mutacao.reiniciar
          ? null
          : mutacao.progresso.trim() || progressoJurisprudenciaDisciplina;
      } else if (mutacao.assuntoId && assuntoSelecionado?.id === mutacao.assuntoId) {
        assuntoSelecionado = {
          ...assuntoSelecionado,
          ...(mutacao.referencia.trim() ? { jurisprudenciaReferencia: mutacao.referencia.trim() } : {}),
          ...(mutacao.progresso.trim() ? { progressoJurisprudencia: mutacao.progresso.trim() } : {}),
        };
      }

      return concluirEtapaLocal(
        { ...estado, progressoJurisprudenciaDisciplina, assuntoSelecionado },
        mutacao.etapaId,
        undefined,
        agoraMs
      );
    }

    case "concluirQuestoes":
      return concluirEtapaLocal(estado, mutacao.etapaId, mutacao.assuntoId, agoraMs);

    case "concluirQuestoesConsolidacao":
    case "concluirQuestoesValidacao":
      // etapa "questoes" de uma Consolidação/Validação nunca carrega um
      // assunto_id singular (cobre vários, via sessao_etapa_assuntos).
      return concluirEtapaLocal(estado, mutacao.etapaId, null, agoraMs);
  }
}

// Aplica a mutação local e a acrescenta no fim da fila de sincronização —
// é a única forma de mudar o estado a partir de uma interação do usuário.
export function enfileirar(
  estado: SessaoLocalState,
  mutacaoSemId: MutacaoSemId,
  agoraMs: number = Date.now()
): SessaoLocalState {
  const mutacao = {
    ...mutacaoSemId,
    id: gerarId(),
    criadaEm: new Date(agoraMs).toISOString(),
  } as MutacaoPendente;

  const aplicado = aplicarMutacaoLocal(estado, mutacao, agoraMs);
  return { ...aplicado, fila: [...aplicado.fila, mutacao] };
}

// Controlador da fila: drena as mutações pendentes uma de cada vez, na
// ordem em que foram criadas, só removendo cada uma depois que `despachar`
// confirma sucesso — é isso que evita reenvio duplicado (concluirEtapa não
// é idempotente no servidor). Um erro (rede caiu de novo, sessão expirou)
// interrompe o loop sem tocar na fila, pronta pra tentar de novo na próxima
// chamada. `obterEstado` é lido a cada volta do loop (não uma vez só) pra
// não perder mutações enfileiradas enquanto uma sincronização anterior
// ainda está em andamento.
export function criarControladorFila(despachar: (mutacao: MutacaoPendente) => Promise<void>) {
  const travas = new Set<string>();

  async function flush(
    sessaoId: string,
    obterEstado: () => SessaoLocalState,
    onMutacaoSincronizada: (mutacao: MutacaoPendente, estado: SessaoLocalState) => void
  ): Promise<void> {
    if (travas.has(sessaoId)) return;
    travas.add(sessaoId);

    try {
      for (;;) {
        const estado = obterEstado();
        if (estado.fila.length === 0) break;

        const proxima = estado.fila[0];
        try {
          await despachar(proxima);
        } catch {
          break;
        }

        const atual = obterEstado();
        const novoEstado: SessaoLocalState = {
          ...atual,
          fila: atual.fila.filter((m) => m.id !== proxima.id),
          atualizadoEm: new Date().toISOString(),
        };
        onMutacaoSincronizada(proxima, novoEstado);
      }
    } finally {
      travas.delete(sessaoId);
    }
  }

  return { flush };
}
