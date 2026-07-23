import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

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

      <button
        type="button"
        disabled
        className="mt-10 rounded-md bg-gold px-8 py-4 text-lg font-semibold text-navy opacity-60"
        title="Sessão adaptativa ainda não implementada"
      >
        Estudar Agora
      </button>
      <p className="mt-3 text-xs text-foreground/50">
        (próxima etapa do produto — ainda não implementada)
      </p>

      <form action={sair} className="mt-16">
        <button type="submit" className="text-sm text-foreground/50 hover:text-foreground">
          Sair
        </button>
      </form>
    </main>
  );
}
