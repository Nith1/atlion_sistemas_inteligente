import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BroadcastForm } from "./broadcast-form";
import { ExportButtons } from "./export-buttons";

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

  const { data: inscritos } = await supabase
    .from("waitlist")
    .select("email, whatsapp, created_at")
    .order("created_at", { ascending: false });

  const total = inscritos?.length ?? 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/60 hover:text-foreground">
        ← Voltar ao painel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Lista de espera</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {total} pessoa(s) inscrita(s). Manda um aviso pra todo mundo — serve
        tanto pra “tá quase abrindo” quanto pra “abriu, aqui está o link”.
      </p>

      <div className="mt-8">
        <BroadcastForm total={total} />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
            Inscritos
          </h2>
          <ExportButtons inscritos={inscritos ?? []} />
        </div>
        <div className="mt-3 max-h-112 overflow-y-auto rounded-md border border-foreground/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-background text-xs uppercase text-foreground/50">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">WhatsApp</th>
                <th className="px-3 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {(inscritos ?? []).map((inscrito) => (
                <tr key={inscrito.email}>
                  <td className="px-3 py-2">{inscrito.email}</td>
                  <td className="px-3 py-2">{inscrito.whatsapp}</td>
                  <td className="px-3 py-2 text-foreground/60">
                    {new Date(inscrito.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-foreground/50">
                    Nenhum inscrito ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
