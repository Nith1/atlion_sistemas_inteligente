-- Assuntos podem ter sub-assuntos (ex: "1" é assunto principal, "1.1" e "1.2"
-- são subtópicos dele) — reflete a estrutura numerada dos editais.

alter table assuntos
  add column parent_id uuid references assuntos(id) on delete cascade;

create index assuntos_parent_id_idx on assuntos(parent_id);
