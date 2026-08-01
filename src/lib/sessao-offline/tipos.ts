// Espelha localmente o essencial de `sessao_etapas` (ver
// src/app/(app)/sessao/page.tsx) — só os campos que a UI ou a fila de
// sincronização realmente usam depois que a etapa vira "atual".
export type EtapaLocal = {
  id: string;
  tipo: string;
  ordem: number;
  concluida: boolean;
  assuntoId: string | null;
  iniciadaEm: string | null;
  tempoGastoSegundos: number | null;
  tempoAcumuladoSegundos: number;
  minutosAjustados: number | null;
};

export type AssuntoSelecionado = {
  id: string;
  nome: string;
  progressoEstudo: string | null;
  leiReferencia: string | null;
  progressoLeiSeca: string | null;
  jurisprudenciaReferencia: string | null;
  progressoJurisprudencia: string | null;
};

// Assunto dentro da etapa "questoes" de uma Sessão de Consolidação ou de
// Validação (Simulado) — ver sessao_etapa_assuntos em
// src/lib/janela-ativacao.ts (Consolidação, peso por tier) e
// src/lib/simulado.ts (Validação, peso percentual por taxa de erro). Uma
// linha nunca tem os dois pesos preenchidos ao mesmo tempo.
export type AssuntoRevisaoGlobal = {
  id: string;
  nome: string;
  peso: "alta" | "media" | "baixa" | null;
  pesoPercentual: number | null;
  leiReferencia: string | null;
  progressoLeiSeca: string | null;
  jurisprudenciaReferencia: string | null;
  progressoJurisprudencia: string | null;
};

// Um grupo de erros pendentes (não revisados) da disciplina, agrupado por
// assunto — mesma forma que caderno-erros/page.tsx usa, sem filtro de sessão.
export type ErroPendenteConsolidacao = {
  assuntoId: string | null;
  assuntoNome: string | null;
  quantidade: number;
  anotacao: string | null;
};

// Tudo que a sessão inteira pode vir a precisar, buscado de uma vez em
// page.tsx enquanto ainda há rede — depois disso nenhuma etapa depende de
// uma nova leitura do servidor pra continuar avançando.
export type SessaoBundle = {
  sessaoId: string;
  sessaoTipo: "normal" | "consolidacao" | "validacao";
  disciplinaId: string;
  disciplinaNome: string;
  leisPrincipais: string[];
  progressoLeiSecaDisciplina: string | null;
  jurisprudenciasPrincipais: string[];
  progressoJurisprudenciaDisciplina: string | null;
  ajusteTempo: number;
  ativacaoModo: string;
  etapas: EtapaLocal[];
  candidatosAtivacao: { id: string; nome: string }[];
  assuntoSelecionado: AssuntoSelecionado | null;
  assuntosRevisaoGlobal: AssuntoRevisaoGlobal[];
  errosPendentesConsolidacao: ErroPendenteConsolidacao[];
  tempoBaseHojeSegundos: number;
};

export type MutacaoPendente =
  | { id: string; criadaEm: string; tipo: "pausarEtapa"; etapaId: string }
  | { id: string; criadaEm: string; tipo: "retomarEtapa"; etapaId: string }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirAtivacaoCognitiva";
      etapaId: string;
      sessaoId: string;
      assuntoIds: string[];
      certas: number | null;
      erradas: number | null;
      anki: boolean | null;
    }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirEstudo";
      etapaId: string;
      sessaoId: string;
      assuntoId: string | null;
    }
  | {
      id: string;
      criadaEm: string;
      tipo: "continuarEstudoDepois";
      etapaId: string;
      sessaoId: string;
      assuntoId: string | null;
      progresso: string;
    }
  | { id: string; criadaEm: string; tipo: "concluirDescanso"; etapaId: string; sessaoId: string }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirLeiSeca";
      etapaId: string;
      sessaoId: string;
      disciplinaId: string;
      assuntoId: string | null;
      usaLeiPrincipal: boolean;
      progresso: string;
      leiReferencia: string;
      reiniciar: boolean;
    }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirJurisprudencia";
      etapaId: string;
      sessaoId: string;
      disciplinaId: string;
      assuntoId: string | null;
      usaJurisprudenciaPrincipal: boolean;
      progresso: string;
      referencia: string;
      reiniciar: boolean;
    }
  | { id: string; criadaEm: string; tipo: "concluirConsolidacao"; etapaId: string; sessaoId: string }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirQuestoes";
      etapaId: string;
      sessaoId: string;
      disciplinaId: string;
      assuntoId: string | null;
      certas: number;
      erradas: number;
      anotacao: string;
    }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirRevisaoErros";
      etapaId: string;
      sessaoId: string;
      disciplinaId: string;
    }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirQuestoesConsolidacao";
      etapaId: string;
      sessaoId: string;
      disciplinaId: string;
      respostas: { assuntoId: string; certas: number; erradas: number }[];
      anotacao: string;
      anki: boolean | null;
    }
  | {
      id: string;
      criadaEm: string;
      tipo: "concluirQuestoesValidacao";
      etapaId: string;
      sessaoId: string;
      disciplinaId: string;
      respostas: { assuntoId: string; certas: number; erradas: number }[];
      anotacao: string;
      anki: boolean | null;
    };

// Omit comum não distribui sobre union types (colapsa MutacaoPendente numa
// interseção só com os campos em comum antes de tirar id/criadaEm) — essa
// variante condicional força a distribuição, preservando cada variante do
// discriminated union.
export type MutacaoSemId<T = MutacaoPendente> = T extends unknown ? Omit<T, "id" | "criadaEm"> : never;

// Estado salvo em localStorage, chave por sessaoId (ver armazenamento.ts).
// `versao` existe pra invalidar com segurança um formato antigo, se essa
// forma mudar no futuro.
export type SessaoLocalState = {
  versao: 1;
  sessaoId: string;
  etapas: EtapaLocal[];
  assuntoSelecionado: AssuntoSelecionado | null;
  progressoLeiSecaDisciplina: string | null;
  progressoJurisprudenciaDisciplina: string | null;
  fila: MutacaoPendente[];
  atualizadoEm: string;
};
