import { createClient } from "@supabase/supabase-js";

// Cliente com service_role — bypassa RLS e a Admin API não é afetada pelo
// toggle "Allow new users to sign up" do projeto (ver seguranca.md seção 10).
// Uso exclusivo server-side, e só pra criar conta no resgate de convite
// (depois do convite já ter sido validado) — não usar em nenhum outro lugar
// por conveniência. NUNCA importar isso num client component nem expor
// SUPABASE_SERVICE_ROLE_KEY como NEXT_PUBLIC_*.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
