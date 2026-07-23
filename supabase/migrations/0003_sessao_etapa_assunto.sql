-- Liga cada etapa de consolidação/prática (lei seca, exercícios, questões...) ao
-- assunto estudado naquela sessão, pra elas continuarem se referindo ao mesmo
-- assunto depois que a etapa de Estudo marca ele como já estudado.

alter table sessao_etapas
  add column assunto_id uuid references assuntos(id) on delete set null;
