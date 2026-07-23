-- Permite pausar/retomar o cronômetro da etapa atual (a pessoa pode se
-- levantar no meio do estudo). tempo_acumulado_segundos guarda o que já foi
-- contado antes da pausa atual; iniciada_em vira null enquanto pausada.
alter table sessao_etapas
  add column tempo_acumulado_segundos int not null default 0,
  add column pausada boolean not null default false;
