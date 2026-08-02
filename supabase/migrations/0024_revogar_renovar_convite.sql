-- Admin precisa poder revogar um convite pendente (invalida o link na hora)
-- e renovar/reenviar um convite (estende a validade e manda o email de
-- novo) direto da tela de /admin/convites, sem precisar gerar um convite
-- novo do zero toda vez.

alter table invites add column revoked_at timestamptz;

-- validar_convite e resgatar_convite precisam passar a considerar revoked_at
-- — senão um convite revogado continuaria "válido" pra quem já tinha o link
-- aberto na tela antes da revogação.
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
    (v_invite.used_at is null and v_invite.revoked_at is null and v_invite.expires_at > now());
end;
$$;

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
    set origem = 'convite', convite_id = v_invite.id
    where id = p_user_id;

  return true;
end;
$$;

-- Revoga um convite ainda não usado — marca revoked_at, o link para de
-- funcionar imediatamente (validar_convite/resgatar_convite já checam isso).
-- Não revoga convite já usado (não faria diferença, a conta já existe).
create or replace function public.revogar_convite(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select p.is_admin into v_is_admin from profiles p where p.id = auth.uid();
  if v_is_admin is not true then
    raise exception 'not authorized';
  end if;

  update invites set revoked_at = now() where id = p_invite_id and used_at is null;
  return found;
end;
$$;

revoke all on function public.revogar_convite(uuid) from public;
grant execute on function public.revogar_convite(uuid) to authenticated;

-- Renova a validade de um convite existente (mais 14 dias a partir de
-- agora) e devolve email+token pra a aplicação reenviar o email — não cria
-- um convite novo, reaproveita o mesmo token/link que a pessoa já pode ter
-- recebido antes. Recusa convite já usado ou revogado (nesses casos o admin
-- deve gerar um convite novo).
create or replace function public.renovar_convite(p_invite_id uuid)
returns table(email text, token uuid)
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

  select * into v_invite from invites where id = p_invite_id;
  if v_invite is null or v_invite.used_at is not null or v_invite.revoked_at is not null then
    return;
  end if;

  update invites set expires_at = now() + interval '14 days' where id = p_invite_id;

  return query select v_invite.email, v_invite.token;
end;
$$;

revoke all on function public.renovar_convite(uuid) from public;
grant execute on function public.renovar_convite(uuid) to authenticated;
