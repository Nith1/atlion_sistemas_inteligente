-- Sugestões e reports de bug — tanto da landing (sem sessão autenticada)
-- quanto de dentro do app. Mesmo padrão de 0020_pre_lancamento.sql:
-- tabela com RLS ligado e SEM policy de insert direta pra sessão sem
-- autenticação — inserção só via função security definer, que lê
-- auth.uid() no servidor (fica null sozinho quando quem envia é anônimo).
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('sugestao', 'bug')),
  mensagem text not null,
  pagina text,
  email text,
  resolvido boolean not null default false,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on feedback (user_id);

alter table feedback enable row level security;

-- só admin lê e atualiza (marcar como resolvido) — mesmo padrão de
-- "invites: admin le tudo" em 0020_pre_lancamento.sql.
create policy "feedback: admin le tudo" on feedback
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "feedback: admin atualiza" on feedback
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

create or replace function public.enviar_feedback(p_tipo text, p_mensagem text, p_pagina text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo not in ('sugestao', 'bug') then
    raise exception 'tipo invalido';
  end if;
  if length(trim(p_mensagem)) < 1 or length(trim(p_mensagem)) > 2000 then
    raise exception 'mensagem invalida';
  end if;

  insert into feedback (user_id, tipo, mensagem, pagina, email)
  values (
    auth.uid(),
    p_tipo,
    trim(p_mensagem),
    nullif(trim(coalesce(p_pagina, '')), ''),
    nullif(lower(trim(coalesce(p_email, ''))), '')
  );

  return true;
end;
$$;

revoke all on function public.enviar_feedback(text, text, text, text) from public;
grant execute on function public.enviar_feedback(text, text, text, text) to anon, authenticated;
