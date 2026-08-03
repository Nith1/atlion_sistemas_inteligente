"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type InfoTipContextValue = { idAberto: string | null; setIdAberto: (id: string | null) => void };

const InfoTipContext = createContext<InfoTipContextValue | null>(null);

// Coordena todos os InfoTip da árvore abaixo pra nunca mais de um ficar
// aberto ao mesmo tempo — sem isso, dois InfoTip com autoAbrir na mesma
// tela (ex: filtro de questões + Anki na Ativação Cognitiva) abrem juntos
// e se sobrepõem, especialmente ruim no mobile. `idAberto` guarda só QUEM
// está aberto; cada InfoTip decide sozinho se é ele mesmo comparando com o
// próprio id.
export function InfoTipProvider({ children }: { children: ReactNode }) {
  const [idAberto, setIdAberto] = useState<string | null>(null);
  return <InfoTipContext.Provider value={{ idAberto, setIdAberto }}>{children}</InfoTipContext.Provider>;
}

export function useInfoTipContext() {
  return useContext(InfoTipContext);
}
