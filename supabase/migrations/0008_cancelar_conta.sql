-- Permite que o próprio usuário apague sua conta (auth.users), algo que a
-- role authenticated não tem permissão de fazer diretamente. security definer
-- roda com o dono da função (que tem acesso), mas auth.uid() garante que só
-- dá pra apagar a própria conta, nunca a de outra pessoa.
--
-- Todo o resto (profiles, disciplinas, assuntos, sessoes, sessao_etapas,
-- questoes_registro) já cai em cascata pelas foreign keys "on delete cascade"
-- definidas em 0001_init.sql — não precisa apagar nada manualmente aqui.
create or replace function public.delete_user()
returns void as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.delete_user() to authenticated;
