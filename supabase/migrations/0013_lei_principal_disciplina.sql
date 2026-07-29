-- Lei Seca como "cronograma à parte": quando a disciplina tem uma lei
-- principal cadastrada (ex: Constituição Federal, Código Penal), a etapa de
-- Lei Seca passa a ler ela de forma contínua, independente do assunto
-- estudado no dia (ver sessao/page.tsx e concluirLeiSeca em
-- sessao/actions.ts). progresso_lei_seca aqui é o "parei em tal artigo"
-- dessa leitura corrida — null quando ainda não começou, ou quando o aluno
-- marcou que terminou tudo e está recomeçando do zero.
alter table disciplinas
  add column lei_principal text,
  add column progresso_lei_seca text;
