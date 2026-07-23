import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-navy">Criar sua conta</h1>
        <p className="mt-2 text-sm text-foreground/70">
          O primeiro passo pra montar seu planejamento de estudos.
        </p>
        <SignupForm />
        <p className="mt-8 text-sm text-foreground/70">
          Já tem conta?{" "}
          <Link href="/login" className="text-navy underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
