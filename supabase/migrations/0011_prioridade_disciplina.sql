-- Prioridade da disciplina: inclina a escolha da Sessão Adaptativa (ver
-- calcularUrgencia em src/lib/disciplinas.ts) sem tirar do sistema a decisão
-- de qual disciplina estudar hoje. Default 'normal' = comportamento idêntico
-- ao de antes (round-robin puro por tempo sem estudar).
alter table disciplinas
  add column prioridade text not null default 'normal'
  check (prioridade in ('baixa', 'normal', 'alta'));
