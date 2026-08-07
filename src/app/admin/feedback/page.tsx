import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { alternarResolvidoFeedback } from "./actions";

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/painel");

  const { data: itensData } = await supabase
    .from("feedback")
    .select("id, tipo, mensagem, pagina, email, resolvido, created_at")
    .order("created_at", { ascending: false });

  const itens = itensData ?? [];
  const pendentes = itens.filter((i) => !i.resolvido).length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/painel" className="text-sm text-foreground/60 hover:text-foreground">
        ← Voltar ao painel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Sugestões e Bugs</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {itens.length} envio(s) no total · {pendentes} pendente(s).
      </p>

      <ul className="mt-8 space-y-3">
        {itens.map((item) => (
          <li
            key={item.id}
            className={`rounded-md border border-foreground/10 bg-foreground/3 p-4 ${
              item.resolvido ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-foreground/50">
                  {item.tipo === "bug" ? "Bug" : "Sugestão"}
                  {item.pagina ? ` · ${item.pagina}` : ""} ·{" "}
                  {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </p>
                <p className="mt-2 text-sm text-foreground">{item.mensagem}</p>
                {item.email && <p className="mt-2 text-xs text-foreground/60">Contato: {item.email}</p>}
              </div>
              <form action={alternarResolvidoFeedback.bind(null, item.id, !item.resolvido)}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-foreground/60 ring-1 ring-foreground/15 hover:text-foreground hover:ring-foreground/30"
                >
                  {item.resolvido ? "Reabrir" : "Marcar resolvido"}
                </button>
              </form>
            </div>
          </li>
        ))}
        {itens.length === 0 && <p className="text-sm text-foreground/50">Nada por aqui ainda.</p>}
      </ul>
    </main>
  );
}
