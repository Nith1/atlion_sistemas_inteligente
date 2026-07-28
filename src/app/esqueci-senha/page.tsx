import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EsqueciSenhaForm } from "./esqueci-senha-form";

export default async function EsqueciSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">Recuperar senha</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Informe o email da sua conta — mandamos um link pra você escolher uma nova senha.
        </p>
        <EsqueciSenhaForm />
        <p className="mt-8 text-sm text-foreground/70">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
