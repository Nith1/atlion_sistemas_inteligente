import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthLogo } from "@/components/auth/auth-logo";
import { FeedbackForm } from "@/components/feedback-form";

// Fora do grupo (app) de propósito: precisa funcionar tanto pra quem tá
// deslogado (vindo da landing) quanto pra quem tá dentro do app — uma
// página só, sem duplicar layout pros dois casos.
export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ano = new Date().getFullYear();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-md">
        <AuthLogo />
        <Link href={user ? "/painel" : "/"} className="text-sm text-foreground/50 hover:text-foreground">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Sugestões e Bugs</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Achou um problema ou tem uma ideia pra melhorar a ATLION? Conta pra gente.
        </p>
        <FeedbackForm />
      </div>
      <p className="mt-16 text-xs text-foreground/40">© {ano} ATLION. Todos os direitos reservados.</p>
    </main>
  );
}
