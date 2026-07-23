import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Continue de onde você parou.
        </p>
        <LoginForm />
        <p className="mt-8 text-sm text-foreground/70">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
