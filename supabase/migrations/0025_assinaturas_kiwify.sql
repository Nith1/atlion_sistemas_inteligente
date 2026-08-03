-- Integração de pagamento via Kiwify. A assinatura não guarda um status
-- binário "ativa/inativa" — guarda uma data de fim de período pago
-- (periodo_fim). Acesso liberado é simplesmente "essa data ainda não
-- passou". Isso resolve sozinho tanto cancelamento (não mexe na data, o
-- período pago corre até o fim natural) quanto falha de renovação (a data
-- não é estendida, o acesso expira sozinho, sem cron/job nenhum rodando por
-- trás). Reembolso/chargeback são os únicos casos que cortam a data pra
-- agora, porque aí sim o dinheiro já não é mais do produtor.
--
-- Chave de dedupe é o email (lower/trim), não order_id/subscription_id da
-- Kiwify — uma assinatura recorrente gera um order_id novo por cobrança, e
-- não há confirmação de qual identificador é estável entre renovações. Os
-- IDs da Kiwify ficam guardados só como auditoria/debug.
create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'inativa', -- só informativo/debug — quem decide acesso é periodo_fim
  periodo_fim timestamptz,                -- acesso liberado enquanto essa data não passar
  kiwify_order_id text,
  kiwify_subscription_id text,
  ultimo_evento text,                     -- order_status cru recebido, pra debug
  ultimo_evento_em timestamptz,           -- defesa contra webhook entregue fora de ordem
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assinaturas_user_id_idx on assinaturas (user_id);

alter table assinaturas enable row level security;

-- usuário só lê a própria assinatura (usado pelo gate em (app)/layout.tsx).
-- Sem policy de insert/update — só service_role escreve (webhook do
-- Kiwify), mesmo padrão de invites/rate_limits.
create policy "assinaturas: proprio usuario le" on assinaturas
  for select using (user_id = auth.uid());

-- Registra um evento de pagamento da Kiwify. p_periodo_fim é opcional:
-- quando vem preenchido, estende ou corta a data de acesso; quando vem
-- null (caso de cancelamento, que não deve cortar o período já pago), só
-- atualiza o status informativo e mantém periodo_fim como estava.
-- "where excluded.ultimo_evento_em > assinaturas.ultimo_evento_em" evita
-- que um webhook reentregue fora de ordem (a Kiwify pode reenviar) sobrescreva
-- um estado mais novo com um mais antigo. Retorna se foi criação (primeira
-- compra desse email) ou atualização (renovação), pra quem chama saber se
-- precisa mandar convite novo ou não — usa o idioma "xmax = 0" do Postgres.
create or replace function public.registrar_evento_assinatura(
  p_email text,
  p_status text,
  p_evento text,
  p_evento_em timestamptz,
  p_order_id text,
  p_subscription_id text,
  p_periodo_fim timestamptz
)
returns table(foi_criado boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into assinaturas (email, status, ultimo_evento, ultimo_evento_em, kiwify_order_id, kiwify_subscription_id, periodo_fim)
  values (lower(trim(p_email)), p_status, p_evento, p_evento_em, p_order_id, p_subscription_id, p_periodo_fim)
  on conflict (email) do update set
    status = excluded.status,
    ultimo_evento = excluded.ultimo_evento,
    ultimo_evento_em = excluded.ultimo_evento_em,
    kiwify_order_id = coalesce(excluded.kiwify_order_id, assinaturas.kiwify_order_id),
    kiwify_subscription_id = coalesce(excluded.kiwify_subscription_id, assinaturas.kiwify_subscription_id),
    periodo_fim = coalesce(excluded.periodo_fim, assinaturas.periodo_fim),
    updated_at = now()
  where excluded.ultimo_evento_em > assinaturas.ultimo_evento_em or assinaturas.ultimo_evento_em is null
  returning (xmax = 0) as foi_criado;
end;
$$;

revoke all on function public.registrar_evento_assinatura(text, text, text, timestamptz, text, text, timestamptz) from public;
grant execute on function public.registrar_evento_assinatura(text, text, text, timestamptz, text, text, timestamptz) to service_role;

-- Cria um convite sem precisar de admin logado — o webhook do Kiwify não
-- tem sessão, então não pode usar criar_convite (que exige is_admin via
-- auth.uid()). created_by fica null de propósito: é o jeito de distinguir
-- depois (em resgatar_convite) se o convite veio de um admin humano ou do
-- sistema, pra decidir profiles.origem = 'convite' vs 'kiwify'.
create or replace function public.criar_convite_sistema(p_email text)
returns table(token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites;
begin
  insert into invites (email, created_by)
  values (lower(trim(p_email)), null)
  returning * into v_invite;

  return query select v_invite.token, v_invite.expires_at;
end;
$$;

revoke all on function public.criar_convite_sistema(text) from public;
grant execute on function public.criar_convite_sistema(text) to service_role;

-- resgatar_convite ganha duas mudanças (resto idêntico à versão de
-- 0024_revogar_renovar_convite.sql):
--
-- 1. origem passa a depender de quem criou o convite, não é mais sempre
--    'convite'. Sem isso, um convite disparado pelo webhook da Kiwify
--    também seria marcado 'convite' e ficaria liberado pra sempre por
--    engano, ignorando completamente o gate de assinatura.
-- 2. backfill de assinaturas.user_id por email — no-op pra convite manual
--    antigo (sem linha correspondente em assinaturas), preenche o vínculo
--    pra convite gerado pela Kiwify.
create or replace function public.resgatar_convite(p_token uuid, p_email text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites;
  v_email_normalizado text := lower(trim(p_email));
begin
  select * into v_invite from invites where token = p_token for update;

  if v_invite is null
    or v_invite.used_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= now()
    or v_invite.email <> v_email_normalizado
  then
    return false;
  end if;

  if not exists (
    select 1 from auth.users u where u.id = p_user_id and lower(u.email) = v_email_normalizado
  ) then
    return false;
  end if;

  update invites set used_at = now() where id = v_invite.id;

  update profiles
    set origem = case when v_invite.created_by is null then 'kiwify' else 'convite' end,
        convite_id = v_invite.id
    where id = p_user_id;

  update assinaturas set user_id = p_user_id
    where email = v_email_normalizado and user_id is null;

  return true;
end;
$$;
