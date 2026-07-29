import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthLogo } from "@/components/auth/auth-logo";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  const ano = new Date().getFullYear();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <h1 className="text-2xl font-semibold text-foreground">Criar sua conta</h1>
        <p className="mt-2 text-sm text-foreground/70">
          O primeiro passo pra montar seu planejamento de estudos.
        </p>
        <SignupForm />
        <p className="mt-8 text-sm text-foreground/70">
          Já tem conta?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
      <p className="mt-16 text-xs text-foreground/40">© {ano} ATLION. Todos os direitos reservados.</p>
    </main>
  );
}
