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
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
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
