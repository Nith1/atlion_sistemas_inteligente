-- Caderno de Erros: permite marcar um erro (ou uma leva de erros da mesma
-- sessão/assunto) como já revisado.
alter table questoes_registro
  add column revisado boolean not null default false;
