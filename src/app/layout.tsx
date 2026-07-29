import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/pwa/registrar-service-worker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATLION — Sistema de planejamento para concursos",
  description:
    "A ATLION organiza automaticamente sua preparação: disciplinas, revisão e progressão, sem você precisar decidir o que estudar a cada dia.",
  // appleWebApp: iOS não lê o manifest.ts pra instalar na tela inicial —
  // precisa desses metadados aqui pra abrir em tela cheia, sem a barra do
  // Safari (ver src/app/manifest.ts pro lado Android/desktop).
  appleWebApp: {
    capable: true,
    title: "Atlion",
    statusBarStyle: "black-translucent",
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
