import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/pwa/registrar-service-worker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const TITULO = "ATLION — Sistema de planejamento para concursos";
const DESCRICAO =
  "A ATLION organiza automaticamente sua preparação: disciplinas, revisão e progressão, sem você precisar decidir o que estudar a cada dia.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://atlionestudos.com.br"),
  title: TITULO,
  description: DESCRICAO,
  // appleWebApp: iOS não lê o manifest.ts pra instalar na tela inicial —
  // precisa desses metadados aqui pra abrir em tela cheia, sem a barra do
  // Safari (ver src/app/manifest.ts pro lado Android/desktop).
  appleWebApp: {
    capable: true,
    title: "Atlion",
    statusBarStyle: "black-translucent",
  },
  // opengraph-image.tsx (na mesma pasta) já gera a imagem automaticamente —
  // só precisa declarar o resto aqui. twitter também reaproveita essa
  // imagem sozinho por convenção do Next, não precisa duplicar.
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    siteName: "ATLION",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
  },
};

export const viewport: Viewport = {
  themeColor: "#142440",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  );
}
