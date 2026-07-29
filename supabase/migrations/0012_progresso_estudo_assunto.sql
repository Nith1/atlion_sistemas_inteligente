-- Continuação de um assunto que não coube numa sessão só (ex: "Poder
-- Constituinte" demora mais que uma etapa de Estudo): quando o aluno marca
-- "ainda não terminei", o assunto continua com ja_estudado = false — a mesma
-- consulta que escolhe "o próximo assunto" no Estudo já pega ele de novo, na
-- ordem certa — e opcionalmente guarda onde parou aqui, no mesmo padrão já
-- usado em progresso_lei_seca / progresso_jurisprudencia.
alter table assuntos
  add column progresso_estudo text;
