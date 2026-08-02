-- Admin precisa ler a lista de espera pra mandar o aviso de lançamento
-- (/admin/lista-de-espera). Mesmo padrão de 0020: só quem tem
-- profiles.is_admin enxerga; ninguém mais tem policy de select nessa
-- tabela (dado pessoal — email/whatsapp — não pode vazar entre usuários).
create policy "waitlist: admin le tudo" on waitlist
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
