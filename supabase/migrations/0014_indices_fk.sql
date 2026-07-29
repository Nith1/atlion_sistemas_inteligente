-- Toda coluna de foreign key precisa de índice (Postgres não indexa FK
-- automaticamente — só a primary key referenciada). Sem isso, toda política
-- RLS baseada em EXISTS (ver 0001_init.sql) e todo filtro por user_id/
-- disciplina_id/sessao_id faz sequential scan conforme a base cresce.
create index if not exists idx_disciplinas_user_id on disciplinas (user_id);

create index if not exists idx_assuntos_disciplina_id on assuntos (disciplina_id);
create index if not exists idx_assuntos_parent_id on assuntos (parent_id);

create index if not exists idx_sessoes_user_id on sessoes (user_id);
create index if not exists idx_sessoes_disciplina_id on sessoes (disciplina_id);

create index if not exists idx_sessao_etapas_sessao_id on sessao_etapas (sessao_id);
create index if not exists idx_sessao_etapas_assunto_id on sessao_etapas (assunto_id);

create index if not exists idx_questoes_registro_user_id on questoes_registro (user_id);
create index if not exists idx_questoes_registro_disciplina_id on questoes_registro (disciplina_id);
create index if not exists idx_questoes_registro_assunto_id on questoes_registro (assunto_id);
create index if not exists idx_questoes_registro_sessao_id on questoes_registro (sessao_id);
