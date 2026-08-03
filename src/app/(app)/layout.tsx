import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoTipProvider } from "@/components/ui/info-tip-provider";
import { Sidebar } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, origem")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;

    // convite manual (pré-Kiwify) fica sempre liberado, não depende de
    // assinatura. Quem veio via Kiwify (origem = 'kiwify') só acessa
    // enquanto o período pago não passar — ver supabase/migrations/0025_*.
    if (!isAdmin && profile?.origem !== "convite") {
      const { data: assinatura } = await supabase
        .from("assinaturas")
        .select("periodo_fim")
        .eq("user_id", user.id)
        .maybeSingle();

      const acessoLiberado = !!assinatura?.periodo_fim && new Date(assinatura.periodo_fim) > new Date();
      if (!acessoLiberado) redirect("/assinatura-inativa");
    }
  }

  return (
    <InfoTipProvider>
      <div className="flex min-h-screen flex-1 flex-col md:flex-row">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </InfoTipProvider>
  );
}
