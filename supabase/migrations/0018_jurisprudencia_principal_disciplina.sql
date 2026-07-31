-- Jurisprudência como "cronograma à parte", espelhando lei_principal
-- (0013_lei_principal_disciplina.sql): quando a disciplina tem uma
-- jurisprudência principal cadastrada, a etapa de Jurisprudência passa a
-- ler ela de forma contínua, independente do assunto estudado no dia (ver
-- sessao/page.tsx e concluirJurisprudencia em sessao/actions.ts).
-- progresso_jurisprudencia aqui é o "parei em tal súmula/tema" dessa leitura
-- corrida — null quando ainda não começou, ou quando o aluno marcou que
-- terminou tudo e está recomeçando do zero.
alter table disciplinas
  add column jurisprudencia_principal text,
  add column progresso_jurisprudencia text;
