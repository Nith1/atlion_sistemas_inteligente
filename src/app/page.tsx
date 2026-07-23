import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Image src="/logo.png" alt="Atlion" width={220} height={0} style={{ height: "auto" }} priority />

      <h1 className="mt-8 max-w-md text-2xl font-semibold leading-snug text-navy">
        Você nunca precisa decidir o que estudar agora. O sistema decide.
      </h1>
      <p className="mt-4 max-w-sm text-foreground/60">
        Planejamento inteligente pra concursos — sem planilha, sem ansiedade de
        organização.
      </p>

      <Link
        href="/signup"
        className="mt-10 rounded-md bg-navy px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Criar Meu Planejamento
      </Link>

      <Link href="/login" className="mt-6 text-sm text-foreground/50 hover:text-foreground">
        Já tem conta? Entrar
      </Link>
    </main>
  );
}
