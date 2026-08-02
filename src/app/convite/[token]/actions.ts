"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarRateLimit } from "@/lib/rate-limit";
import { TERMOS_VERSAO } from "@/lib/termos";

export type ConviteState = { error: string | null };

export async function resgatarConvite(
  token: string,
  email: string,
  _prevState: ConviteState,
  formData: FormData
): Promise<ConviteState> {
  const password = formData.get("password") as string;

  // caixinha de aceite obrigatória — checa server-side, nunca confia só no
  // `required` do HTML (nada impede alguém de mandar o form sem o campo)
  if (formData.get("aceiteTermos") !== "on") {
    return { error: "Precisa aceitar os Termos de Uso e a Política de Privacidade pra continuar." };
  }

  const podeTentar = await verificarRateLimit("signup", email);
  if (!podeTentar) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const supabase = await createClient();

  // revalida o convite no servidor mesmo que a página já tenha checado —
  // nunca confiar só no que o cliente diz que é válido
  const { data: convite, error: erroConvite } = await supabase
    .rpc("validar_convite", { p_token: token })
    .single<{ email: string | null; valido: boolean }>();

  if (erroConvite || !convite?.valido || convite.email !== email) {
    return { error: "Esse convite não é mais válido." };
  }

  // cria via Admin API (service_role), não via auth.signUp() público — o
  // signUp() é uma API pública do Supabase que qualquer um pode chamar
  // direto com a anon key, ignorando completamente a validação de convite
  // acima. A Admin API só existe no servidor (service_role nunca chega no
  // cliente) e é a única forma de conta ser criada depois que o self-signup
  // for desligado no painel do Supabase. email_confirm: true porque quem
  // recebeu o link do convite já provou que é dono do email — não precisa
  // de uma segunda confirmação por email.
  const admin = createAdminClient();
  const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (erroCriacao || !criado.user) {
    return { error: "Não foi possível criar a conta. Se você já tem uma conta com esse email, tente fazer login." };
  }

  // registro de consentimento (LGPD): grava quando e qual versão dos termos
  // foi aceita, não só o fato de ter marcado a caixinha. Via admin client
  // (não depende de sessão, que ainda nem existe nesse ponto) — fica gravado
  // mesmo que o signInWithPassword logo abaixo falhe por algum motivo.
  await admin
    .from("profiles")
    .update({ termos_aceitos_em: new Date().toISOString(), termos_versao: TERMOS_VERSAO })
    .eq("id", criado.user.id);

  const { data: resgatado } = await supabase.rpc("resgatar_convite", {
    p_token: token,
    p_email: email,
    p_user_id: criado.user.id,
  });

  if (!resgatado) {
    return { error: "Esse convite já foi usado ou expirou." };
  }

  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password });
  if (erroLogin) {
    // conta criada e convite resgatado — só o login automático falhou, manda
    // pro login normal em vez de deixar a pessoa travada na tela de convite
    redirect("/login");
  }

  redirect("/onboarding");
}
