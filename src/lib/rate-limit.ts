import { createClient } from "@/lib/supabase/server";

// Limites por ação — ver seguranca.md seção 6. Login tolera mais tentativas
// (erro de digitação é comum); recuperação de senha é o mais restrito
// porque cada tentativa dispara um email de verdade pra uma caixa de
// entrada real.
export const LIMITES_RATE = {
  login: { limite: 10, janelaSegundos: 15 * 60 },
  signup: { limite: 5, janelaSegundos: 60 * 60 },
  esqueciSenha: { limite: 3, janelaSegundos: 60 * 60 },
  waitlist: { limite: 5, janelaSegundos: 60 * 60 },
} as const;

// Verifica e registra uma tentativa via a função RPC (security definer) —
// ver 0015_rate_limits.sql. Se a chamada em si falhar (ex: instabilidade de
// rede), deixa passar: rate limit é uma camada extra de proteção, não a
// única (o Supabase Auth já limita essas mesmas rotas no nível dele); um
// erro aqui não deve virar uma indisponibilidade de login pra todo mundo.
export async function verificarRateLimit(
  acao: keyof typeof LIMITES_RATE,
  identificador: string
): Promise<boolean> {
  const { limite, janelaSegundos } = LIMITES_RATE[acao];
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("verificar_rate_limit", {
    p_chave: `${acao}:${identificador.trim().toLowerCase()}`,
    p_limite: limite,
    p_janela_segundos: janelaSegundos,
  });

  if (error) return true;
  return data === true;
}
