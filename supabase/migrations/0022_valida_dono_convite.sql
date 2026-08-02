-- resgatar_convite (0020) confiava em p_user_id vindo do cliente sem validar
-- que ele pertence a quem tem o convite — quem tivesse QUALQUER convite
-- válido (email+token próprios) podia chamar a RPC direto (é security
-- definer, exposta a anon/authenticated) passando o p_user_id de OUTRA
-- conta qualquer, queimando o próprio convite contra o perfil alheio e
-- sobrescrevendo origem/convite_id de quem não tem nada a ver com isso.
--
-- Fix: exige que auth.users.email do p_user_id recebido bata exatamente
-- com o email do convite (o mesmo que já validamos contra invites.email).
-- Como email é único em auth.users, isso amarra o resgate à conta que
-- realmente foi criada com aquele email — não dá mais pra apontar pra
-- conta de outra pessoa.
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
