import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthLogo } from "@/components/auth/auth-logo";
import { ConviteForm } from "./conviteform";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");

  const { data: convite } = await supabase
    .rpc("validar_convite", { p_token: token })
    .single<{ email: string | null; valido: boolean }>();

  const ano = new Date().getFullYear();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm">
        <AuthLogo />
        {convite?.valido && convite.email ? (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Você foi convidado</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Crie sua senha pra ativar o acesso à ATLION.
            </p>
            <ConviteForm token={token} email={convite.email} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Esse convite não é mais válido</h1>
            <p className="mt-2 text-sm text-foreground/70">
              O link pode ter expirado ou já ter sido usado. Entre na lista de
              espera pra ser avisado quando abrir uma vaga.
            </p>
            <Link
              href="/#lista-de-espera"
              className="mt-8 inline-block rounded-full bg-[#C8A15A] px-9 py-3.5 text-sm font-semibold text-[#08111D] transition hover:opacity-90"
            >
              Entrar na lista de espera
            </Link>
          </>
        )}
        <p className="mt-8 text-sm text-foreground/70">
          Já tem conta?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
      <p className="mt-16 text-xs text-foreground/40">© {ano} ATLION. Todos os direitos reservados.</p>
    </main>
  );
}
