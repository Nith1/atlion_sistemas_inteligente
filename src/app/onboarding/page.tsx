import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completo")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completo) redirect("/painel");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <OnboardingWizard />
    </main>
  );
}
