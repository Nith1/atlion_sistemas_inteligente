import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BroadcastForm } from "./broadcast-form";

export default async function AdminListaDeEsperaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/painel");

  const { count } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/60 hover:text-foreground">
        ← Voltar ao painel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Lista de espera</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {count ?? 0} pessoa(s) inscrita(s). Manda um aviso pra todo mundo —
        serve tanto pra “tá quase abrindo” quanto pra “abriu, aqui está o
        link”.
      </p>

      <div className="mt-8">
        <BroadcastForm total={count ?? 0} />
      </div>
    </main>
  );
}
