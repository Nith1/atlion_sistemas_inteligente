import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // "next" vem da query string de um link de email — nunca confiar nele sem
  // validar. Sem essa checagem, alguém poderia gerar seu próprio link de
  // confirmação (token válido pra própria conta) com next=https://site-malicioso
  // e mandar disfarçado de email da ATLION: o servidor validaria o OTP de
  // quem clicou (mesmo sem ser o dono do link) e redirecionaria pro site
  // malicioso, usando o domínio real como fachada de phishing. Só aceita
  // path relativo interno (começa com "/", nunca "//" — protocol-relative
  // URL também escapa do domínio).
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/onboarding";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?erro=confirmacao");
}
