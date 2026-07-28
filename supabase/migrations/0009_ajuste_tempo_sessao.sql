-- Ajuste de tempo por sessão: multiplicador aplicado sobre a duração
-- sugerida de cada etapa (MINUTOS_SUGERIDOS), pra quem naquele dia
-- específico tem mais ou menos tempo que o normal.
--
-- Propositalmente não é uma preferência do profile — é por sessão, e toda
-- sessão nova volta pro padrão (1). Isso é gerenciável no dia a dia, não
-- uma configuração permanente do método.
alter table sessoes
  add column ajuste_tempo numeric not null default 1;
