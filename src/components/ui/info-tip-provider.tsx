"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

const CHAVE_VISTO = (id: string) => `atlion-infotip-visto-${id}`;

type InfoTipContextValue = {
  idAberto: string | null;
  setIdAberto: (id: string | null) => void;
  registrarAutoAbrir: (id: string) => void;
};

const InfoTipContext = createContext<InfoTipContextValue | null>(null);

// Coordena todos os InfoTip da árvore abaixo pra nunca mais de um ficar
// aberto ao mesmo tempo — sem isso, dois InfoTip com autoAbrir na mesma
// tela (ex: filtro de questões + Anki na Ativação Cognitiva) abrem juntos
// e se sobrepõem, especialmente ruim no mobile. `idAberto` guarda só QUEM
// está aberto; cada InfoTip decide sozinho se é ele mesmo comparando com o
// próprio id.
//
// `registrarAutoAbrir`: quando mais de um InfoTip com autoAbrir monta na
// mesma tela, os efeitos de cada um rodam no mesmo commit — sem fila, os
// dois tentam abrir ao mesmo tempo, o último sobrescreve o primeiro (que
// nunca chega a aparecer na tela) e AMBOS já ficam marcados como "visto" no
// localStorage, então o primeiro nunca mais abre sozinho de novo. `abertoRef`
// (não state) garante decisão correta mesmo entre efeitos do mesmo commit,
// já que state só atualiza depois que todos os efeitos do commit rodarem.
// Só marca "visto" no momento em que o InfoTip realmente abre — o que espera
// na fila continua elegível até ser a vez dele.
export function InfoTipProvider({ children }: { children: ReactNode }) {
  const [idAberto, setIdAbertoState] = useState<string | null>(null);
  const abertoRef = useRef<string | null>(null);
  const filaRef = useRef<string[]>([]);

  function abrir(id: string) {
    abertoRef.current = id;
    setIdAbertoState(id);
  }

  function fechar() {
    abertoRef.current = null;
    setIdAbertoState(null);
    const proximo = filaRef.current.shift();
    if (proximo !== undefined) {
      window.localStorage.setItem(CHAVE_VISTO(proximo), "1");
      abrir(proximo);
    }
  }

  function setIdAberto(id: string | null) {
    if (id === null) fechar();
    else abrir(id);
  }

  function registrarAutoAbrir(id: string) {
    if (window.localStorage.getItem(CHAVE_VISTO(id))) return;
    if (abertoRef.current === id || filaRef.current.includes(id)) return;

    if (abertoRef.current === null) {
      window.localStorage.setItem(CHAVE_VISTO(id), "1");
      abrir(id);
    } else {
      filaRef.current.push(id);
    }
  }

  return (
    <InfoTipContext.Provider value={{ idAberto, setIdAberto, registrarAutoAbrir }}>
      {children}
    </InfoTipContext.Provider>
  );
}

export function useInfoTipContext() {
  return useContext(InfoTipContext);
}
