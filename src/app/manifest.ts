import type { MetadataRoute } from "next";

// Torna o Atlion instalável (ícone na tela inicial, abre em tela cheia, sem
// barra do navegador) — ver decisão em identidade/design-guide.md e
// vision.md: só a instalabilidade, sem service worker/cache offline (isso é
// tratado à parte, hoje só na sessão de estudo — ver src/lib/sessao-offline).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlion — Sistema de planejamento para concursos",
    short_name: "Atlion",
    description:
      "A Atlion organiza automaticamente sua preparação: disciplinas, revisão e progressão, sem você precisar decidir o que estudar a cada dia.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#142440",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
