"use client";

import { useInstalarApp } from "@/lib/pwa/usar-instalar-app";

// Opção secundária, discreta, abaixo do CTA principal — ver
// src/lib/pwa/usar-instalar-app.ts. Some sozinho se já instalado ou se o
// navegador não suportar nem beforeinstallprompt nem for iOS.
export function InstalarAppLink() {
  const { instalado, ehIOS, podeInstalar, instalar } = useInstalarApp();

  if (instalado) return null;

  if (podeInstalar) {
    return (
      <button
        type="button"
        onClick={instalar}
        className="text-sm text-[#F5F3EF]/50 underline underline-offset-4 transition hover:text-[#F5F3EF]/80"
      >
        Prefere como app? Instalar na tela inicial
      </button>
    );
  }

  if (ehIOS) {
    return (
      <p className="text-sm text-[#F5F3EF]/50">
        No iPhone: toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot; pra instalar.
      </p>
    );
  }

  return null;
}
