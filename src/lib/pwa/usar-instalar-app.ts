"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type EventoInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function inscreverModoStandalone(notificar: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", notificar);
  return () => mql.removeEventListener("change", notificar);
}
function obterModoStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari/iOS não tem display-mode: standalone — expõe isso à parte.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function obterModoStandaloneServidor() {
  return false;
}

// Nunca muda depois do primeiro load — só existe pra reaproveitar o mesmo
// padrão SSR-safe (useSyncExternalStore) usado em usar-status-online.ts, em
// vez de setState síncrono dentro de um efeito.
function nuncaNotifica() {
  return () => {};
}
function obterEhIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
function obterEhIOSServidor() {
  return false;
}

// beforeinstallprompt (Chrome/Edge/Android) deixa capturar o prompt nativo de
// instalação e disparar de um botão nosso, em vez de depender da pessoa
// achar o ícone escondido na barra de endereço. No iOS a Apple não dá esse
// gancho — lá só dá pra instruir "Compartilhar → Adicionar à Tela de
// Início" (ver ehIOS abaixo).
export function useInstalarApp() {
  const instalado = useSyncExternalStore(inscreverModoStandalone, obterModoStandalone, obterModoStandaloneServidor);
  const ehIOS = useSyncExternalStore(nuncaNotifica, obterEhIOS, obterEhIOSServidor);
  const [evento, setEvento] = useState<EventoInstalacao | null>(null);

  useEffect(() => {
    function aoDisponibilizar(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalacao);
    }
    function aoInstalar() {
      setEvento(null);
    }

    window.addEventListener("beforeinstallprompt", aoDisponibilizar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoDisponibilizar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  return { instalado, ehIOS, podeInstalar: !!evento, instalar };
}
