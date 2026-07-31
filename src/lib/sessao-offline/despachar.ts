"use client";

import { startTransition } from "react";
import {
  concluirAtivacaoCognitiva,
  concluirConsolidacao,
  concluirDescanso,
  concluirEstudo,
  concluirJurisprudencia,
  concluirLeiSeca,
  concluirQuestoes,
  concluirQuestoesConsolidacao,
  concluirQuestoesValidacao,
  concluirRevisaoErros,
  continuarEstudoDepois,
  pausarEtapa,
  retomarEtapa,
} from "@/app/(app)/sessao/actions";
import type { MutacaoPendente } from "./tipos";

// Server Actions chamadas fora de um <form> real precisam rodar dentro de
// startTransition (recomendação do próprio Next pra invocação programática)
// — aqui isso vira uma Promise só, que resolve/rejeita conforme a Server
// Action, pra criarControladorFila (fila.ts) poder simplesmente `await`.
function rodarNaTransicao(chamarAcao: () => Promise<unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    startTransition(() => {
      chamarAcao().then(() => resolve(), reject);
    });
  });
}

// Único módulo que liga uma MutacaoPendente (fila.ts) de volta às Server
// Actions de verdade (sessao/actions.ts) — reconstrói o FormData que cada
// action espera, exatamente como um <form> real enviaria.
export function despacharMutacao(mutacao: MutacaoPendente): Promise<void> {
  switch (mutacao.tipo) {
    case "pausarEtapa":
      return rodarNaTransicao(() => pausarEtapa(mutacao.etapaId));

    case "retomarEtapa":
      return rodarNaTransicao(() => retomarEtapa(mutacao.etapaId));

    case "concluirAtivacaoCognitiva": {
      const formData = new FormData();
      mutacao.assuntoIds.forEach((id) => formData.append("assuntoId", id));
      if (mutacao.certas !== null) formData.set("certas", String(mutacao.certas));
      if (mutacao.erradas !== null) formData.set("erradas", String(mutacao.erradas));
      if (mutacao.anki !== null) formData.set("anki", mutacao.anki ? "on" : "");
      return rodarNaTransicao(() => concluirAtivacaoCognitiva(mutacao.etapaId, mutacao.sessaoId, formData));
    }

    case "concluirEstudo":
      return rodarNaTransicao(() => concluirEstudo(mutacao.etapaId, mutacao.sessaoId, mutacao.assuntoId));

    case "continuarEstudoDepois": {
      const formData = new FormData();
      formData.set("progresso", mutacao.progresso);
      return rodarNaTransicao(() =>
        continuarEstudoDepois(mutacao.etapaId, mutacao.sessaoId, mutacao.assuntoId, formData)
      );
    }

    case "concluirDescanso":
      return rodarNaTransicao(() => concluirDescanso(mutacao.etapaId, mutacao.sessaoId));

    case "concluirLeiSeca": {
      const formData = new FormData();
      formData.set("progresso", mutacao.progresso);
      formData.set("leiReferencia", mutacao.leiReferencia);
      if (mutacao.reiniciar) formData.set("reiniciar", "on");
      return rodarNaTransicao(() =>
        concluirLeiSeca(mutacao.etapaId, mutacao.sessaoId, mutacao.disciplinaId, mutacao.assuntoId, formData)
      );
    }

    case "concluirJurisprudencia": {
      const formData = new FormData();
      formData.set("referencia", mutacao.referencia);
      formData.set("progresso", mutacao.progresso);
      if (mutacao.reiniciar) formData.set("reiniciar", "on");
      return rodarNaTransicao(() =>
        concluirJurisprudencia(mutacao.etapaId, mutacao.sessaoId, mutacao.disciplinaId, mutacao.assuntoId, formData)
      );
    }

    case "concluirConsolidacao":
      return rodarNaTransicao(() => concluirConsolidacao(mutacao.etapaId, mutacao.sessaoId));

    case "concluirQuestoes": {
      const formData = new FormData();
      formData.set("certas", String(mutacao.certas));
      formData.set("erradas", String(mutacao.erradas));
      formData.set("anotacao", mutacao.anotacao);
      return rodarNaTransicao(() =>
        concluirQuestoes(mutacao.etapaId, mutacao.sessaoId, mutacao.disciplinaId, mutacao.assuntoId, formData)
      );
    }

    case "concluirRevisaoErros":
      return rodarNaTransicao(() =>
        concluirRevisaoErros(mutacao.etapaId, mutacao.sessaoId, mutacao.disciplinaId)
      );

    case "concluirQuestoesConsolidacao": {
      const formData = new FormData();
      mutacao.respostas.forEach((r) => {
        formData.append("assuntoId", r.assuntoId);
        formData.set(`certas_${r.assuntoId}`, String(r.certas));
        formData.set(`erradas_${r.assuntoId}`, String(r.erradas));
      });
      formData.set("anotacao", mutacao.anotacao);
      if (mutacao.anki !== null) formData.set("anki", mutacao.anki ? "on" : "");
      return rodarNaTransicao(() =>
        concluirQuestoesConsolidacao(mutacao.etapaId, mutacao.sessaoId, mutacao.disciplinaId, formData)
      );
    }

    case "concluirQuestoesValidacao": {
      const formData = new FormData();
      mutacao.respostas.forEach((r) => {
        formData.append("assuntoId", r.assuntoId);
        formData.set(`certas_${r.assuntoId}`, String(r.certas));
        formData.set(`erradas_${r.assuntoId}`, String(r.erradas));
      });
      formData.set("anotacao", mutacao.anotacao);
      if (mutacao.anki !== null) formData.set("anki", mutacao.anki ? "on" : "");
      return rodarNaTransicao(() =>
        concluirQuestoesValidacao(mutacao.etapaId, mutacao.sessaoId, mutacao.disciplinaId, formData)
      );
    }
  }
}
