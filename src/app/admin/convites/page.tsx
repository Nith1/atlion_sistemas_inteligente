import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConviteForm } from "./convite-form";

function statusConvite(convite: { used_at: string | null; expires_at: string }) {
  if (convite.used_at) return "Usado";
  if (new Date(convite.expires_at) <= new Date()) return "Expirado";
  return "Pendente";
}

export default async function AdminConvitesPage() {
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

  const { data: convites } = await supabase
    .from("invites")
    .select("id, email, created_at, expires_at, used_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/60 hover:text-foreground">
        ← Voltar ao painel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Convites</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Gera um link de convite vinculado a um email específico. Só quem
        entrar com esse email consegue usar o link.
      </p>

      <div className="mt-8">
        <ConviteForm />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Convites gerados
        </h2>
        <div className="mt-3 divide-y divide-foreground/10 border-t border-foreground/10">
          {(convites ?? []).map((convite) => (
            <div key={convite.id} className="flex items-center justify-between py-3 text-sm">
              <span>{convite.email}</span>
              <span className="text-foreground/60">{statusConvite(convite)}</span>
            </div>
          ))}
          {(convites ?? []).length === 0 && (
            <p className="py-3 text-sm text-foreground/50">Nenhum convite ainda.</p>
          )}
        </div>
      </div>
    </main>
  );
}
