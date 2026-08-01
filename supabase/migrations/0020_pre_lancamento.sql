-- Pré-lançamento: fecha o cadastro público. As únicas portas de entrada
-- passam a ser convite individual (presente de assinatura, vinculado a um
-- email específico) e lista de espera (captação na landing). Ver
-- seguranca.md — mesmo padrão de 0015_rate_limits.sql: tabela com RLS
-- ligado e SEM policy direta pra operações sem sessão autenticada, acesso
-- só via função security definer.

-- lista de espera: captada na landing, sem sessão autenticada
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  whatsapp text not null,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;

create or replace function public.entrar_lista_espera(p_email text, p_whatsapp text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into waitlist (email, whatsapp)
  values (lower(trim(p_email)), trim(p_whatsapp))
  on conflict (email) do update set whatsapp = excluded.whatsapp;
  return true;
end;
$$;

revoke all on function public.entrar_lista_espera(text, text) from public;
grant execute on function public.entrar_lista_espera(text, text) to anon, authenticated;

-- convites: presente de assinatura, criado por um admin e vinculado a um
-- email específico. Resgate acontece sem sessão autenticada (antes do
-- signUp), então segue o mesmo padrão de acesso só via função.
create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz
);

create index invites_email_idx on invites (email);
create index invites_created_by_idx on invites (created_by);

alter table invites enable row level security;

-- profiles ganha is_admin (gate da área /admin), origem (de propósito solto,
-- não enum — 'convite' hoje, 'kiwify' quando a integração de pagamento
-- existir, sem precisar de migração de schema) e convite_id (rastreabilidade)
alter table profiles add column is_admin boolean not null default false;
alter table profiles add column origem text;
alter table profiles add column convite_id uuid references invites(id) on delete set null;

create index profiles_convite_id_idx on profiles (convite_id);

-- só admin lê a lista de convites (usado pela página /admin/convites).
-- insert/update não têm policy — só acontecem via funções abaixo, que
-- controlam token, validade e autorização no servidor, nunca confiando em
-- dado vindo do cliente.
create policy "invites: admin le tudo" on invites
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- cria um convite pra um email específico. Revalida is_admin dentro da
-- própria função (defesa em camadas — não confia só na policy de select
-- nem no gate da página admin).
create or replace function public.criar_convite(p_email text)
returns table(token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_invite invites;
begin
  select p.is_admin into v_is_admin from profiles p where p.id = auth.uid();

  if v_is_admin is not true then
    raise exception 'not authorized';
  end if;

  insert into invites (email, created_by)
  values (lower(trim(p_email)), auth.uid())
  returning * into v_invite;

  return query select v_invite.token, v_invite.expires_at;
end;
$$;

revoke all on function public.criar_convite(text) from public;
grant execute on function public.criar_convite(text) to authenticated;

-- checa se um token de convite é válido e retorna o email vinculado (sem
-- expor mais nada da tabela) — usado na página /convite/[token] antes do
-- signUp, sem sessão autenticada.
create or replace function public.validar_convite(p_token uuid)
returns table(email text, valido boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites;
begin
  select * into v_invite from invites where token = p_token;

  if v_invite is null then
    return query select null::text, false;
    return;
  end if;

  return query select
    v_invite.email,
    (v_invite.used_at is null and v_invite.expires_at > now());
end;
$$;

revoke all on function public.validar_convite(uuid) from public;
grant execute on function public.validar_convite(uuid) to anon, authenticated;

-- marca o convite como usado e vincula o profile recém-criado a ele.
-- Chamada logo depois do auth.signUp, antes de existir sessão (confirmação
-- de email pode estar pendente) — por isso recebe p_user_id em vez de usar
-- auth.uid(). Revalida tudo de novo (token existe, não usado, não expirado,
-- email bate exatamente) em vez de confiar no que a página já checou.
create or replace function public.resgatar_convite(p_token uuid, p_email text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites;
begin
  select * into v_invite from invites where token = p_token for update;

  if v_invite is null
    or v_invite.used_at is not null
    or v_invite.expires_at <= now()
    or v_invite.email <> lower(trim(p_email))
  then
    return false;
  end if;

  update invites set used_at = now() where id = v_invite.id;

  update profiles
    set origem = 'convite', convite_id = v_invite.id
    where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.resgatar_convite(uuid, text, uuid) from public;
grant execute on function public.resgatar_convite(uuid, text, uuid) to anon, authenticated;
