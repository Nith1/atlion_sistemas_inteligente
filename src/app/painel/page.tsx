import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";
import { iniciarSessao } from "../sessao/actions";

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("concurso, onboarding_completo")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completo) redirect("/onboarding");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm text-foreground/60">Planejamento para</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground">{profile.concurso}</h1>

      <form action={iniciarSessao}>
        <button
          type="submit"
          className="mt-10 rounded-md bg-gold px-8 py-4 text-lg font-semibold text-navy hover:opacity-90"
        >
          Estudar Agora
        </button>
      </form>

      <Link
        href="/planejamento"
        className="mt-6 text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground"
      >
        Gerenciar disciplinas e assuntos
      </Link>

      <Link
        href="/caderno-erros"
        className="mt-3 text-sm text-foreground/70 underline underline-offset-4 hover:text-foreground"
      >
        Caderno de erros
      </Link>

      <form action={sair} className="mt-16">
        <button type="submit" className="text-sm text-foreground/50 hover:text-foreground">
          Sair
        </button>
      </form>
    </main>
  );
}
