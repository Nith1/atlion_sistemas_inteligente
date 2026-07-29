"use client";

import { useEffect } from "react";

// Registra o service worker mínimo (ver public/sw.js) — necessário só pro
// Chrome/Android considerar o app instalável (beforeinstallprompt exige um
// service worker com handler de fetch). Não faz cache nem serve nada
// offline.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
