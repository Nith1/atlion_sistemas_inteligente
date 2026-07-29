-- Rate limiting pra login, signup e recuperação de senha (brute force /
-- enumeração de email) — ver seguranca.md, seção 6.
--
-- A tabela em si fica com RLS ligado e SEM nenhuma policy: isso nega acesso
-- direto pra anon/authenticated por padrão (fail secure). A única forma de
-- ler ou escrever é através da função abaixo (security definer). Isso
-- importa porque login/signup/esqueci-senha rodam sem sessão autenticada —
-- se a tabela tivesse uma policy permissiva, alguém poderia bater direto no
-- PostgREST com a anon key e apagar/resetar o próprio contador.
create table rate_limits (
  chave text primary key,
  tentativas int not null default 1,
  janela_inicio timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rate_limits enable row level security;

-- Verifica e registra uma tentativa pra `p_chave` (ex: "login:email@x.com").
-- Retorna true se a tentativa pode prosseguir, false se estourou o limite
-- dentro da janela. A checagem e o incremento acontecem atomicamente dentro
-- da função — chamar essa função direto (bypassando o app) não ajuda a
-- burlar o limite, porque a própria função É o limite.
create or replace function public.verificar_rate_limit(
  p_chave text,
  p_limite int,
  p_janela_segundos int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro rate_limits;
begin
  select * into v_registro from rate_limits where chave = p_chave for update;

  if v_registro is null then
    insert into rate_limits (chave, tentativas, janela_inicio, updated_at)
    values (p_chave, 1, now(), now());
    return true;
  end if;

  if now() - v_registro.janela_inicio > make_interval(secs => p_janela_segundos) then
    update rate_limits
      set tentativas = 1, janela_inicio = now(), updated_at = now()
      where chave = p_chave;
    return true;
  end if;

  if v_registro.tentativas >= p_limite then
    return false;
  end if;

  update rate_limits
    set tentativas = tentativas + 1, updated_at = now()
    where chave = p_chave;
  return true;
end;
$$;

revoke all on function public.verificar_rate_limit(text, int, int) from public;
grant execute on function public.verificar_rate_limit(text, int, int) to anon, authenticated;
