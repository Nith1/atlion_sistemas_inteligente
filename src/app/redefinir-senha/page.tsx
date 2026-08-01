import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthLogo } from "@/components/auth/auth-logo";
import { RedefinirSenhaForm } from "./redefinir-senha-form";

export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só chega aqui com sessão válida se veio do link de recuperação por
  // email (verifyOtp em /auth/confirm já cria a sessão antes de
  // redirecionar pra cá). Sem sessão, não tem como redefinir a senha de
  // ninguém.
  if (!user) redirect("/login");

  const ano = new Date().getFullYear();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <h1 className="text-2xl font-semibold text-foreground">Escolher nova senha</h1>
        <p className="mt-2 text-sm text-foreground/70">Defina a nova senha da sua conta.</p>
        <RedefinirSenhaForm />
      </div>
      <p className="mt-16 text-xs text-foreground/40">© {ano} ATLION. Todos os direitos reservados.</p>
    </main>
  );
}
