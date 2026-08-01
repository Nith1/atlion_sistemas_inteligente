-- Onboarding e Planejamento passam a permitir múltiplas leis e múltiplas
-- jurisprudências principais por disciplina (antes só uma, ver
-- 0013_lei_principal_disciplina.sql e 0018_jurisprudencia_principal_disciplina.sql).
-- Convertendo lei_principal/jurisprudencia_principal de text pra text[],
-- preservando o valor único já cadastrado como primeiro item do array.
-- progresso_lei_seca e progresso_jurisprudencia continuam texto livre —
-- descrevem "onde parei" na leitura corrida, não amarrados a uma lei
-- específica da lista, então não precisam mudar.
alter table disciplinas
  add column leis_principais text[] not null default '{}',
  add column jurisprudencias_principais text[] not null default '{}';

update disciplinas set leis_principais = array[lei_principal] where lei_principal is not null;
update disciplinas set jurisprudencias_principais = array[jurisprudencia_principal] where jurisprudencia_principal is not null;

alter table disciplinas
  drop column lei_principal,
  drop column jurisprudencia_principal;
