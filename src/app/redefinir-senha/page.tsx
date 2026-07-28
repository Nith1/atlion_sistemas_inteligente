import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">Escolher nova senha</h1>
        <p className="mt-2 text-sm text-foreground/70">Defina a nova senha da sua conta.</p>
        <RedefinirSenhaForm />
      </div>
    </main>
  );
}
