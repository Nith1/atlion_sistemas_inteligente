"use client";

import { useSyncExternalStore } from "react";

function inscrever(notificar: () => void) {
  window.addEventListener("online", notificar);
  window.addEventListener("offline", notificar);
  return () => {
    window.removeEventListener("online", notificar);
    window.removeEventListener("offline", notificar);
  };
}

// navigator.onLine reflete o estado da interface de rede, não conectividade
// real (ex: wifi conectado sem internet de verdade) — de propósito não
// existe aqui nenhuma checagem ativa (ping periódico): quem garante que
// nada se perde ou duplica é a fila (fila.ts), que só remove uma mutação
// depois de confirmar sucesso. Esse hook só alimenta o indicador visual.
function obterInstantaneo() {
  return navigator.onLine;
}

// No servidor não existe navigator — assume online, já que esta tela só
// carrega com rede mesmo (é um Server Component). O valor real do
// navegador assume o lugar assim que o hook resolve no client.
function obterInstantaneoServidor() {
  return true;
}

export function useStatusOnline(): boolean {
  return useSyncExternalStore(inscrever, obterInstantaneo, obterInstantaneoServidor);
}
