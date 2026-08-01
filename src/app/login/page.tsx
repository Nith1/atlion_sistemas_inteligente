import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthLogo } from "@/components/auth/auth-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ conta?: string; erro?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  const params = await searchParams;
  const ano = new Date().getFullYear();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Continue de onde você parou.
        </p>
        {params.conta === "encerrada" && (
          <p className="mt-4 rounded-md border border-foreground/10 bg-foreground/5 p-3 text-sm text-foreground/70">
            Sua conta foi encerrada. Esperamos ver você de novo.
          </p>
        )}
        {params.erro === "confirmacao" && (
          <p className="mt-4 rounded-md border border-red-600/20 bg-red-600/5 p-3 text-sm text-red-600">
            Não foi possível confirmar. Tente de novo.
          </p>
        )}
        <LoginForm />
        <p className="mt-8 text-sm text-foreground/70">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </div>
      <p className="mt-16 text-xs text-foreground/40">© {ano} ATLION. Todos os direitos reservados.</p>
    </main>
  );
}
