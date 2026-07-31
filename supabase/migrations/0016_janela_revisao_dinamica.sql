-- Fase 1 da janela de revisão dinâmica: a Ativação Cognitiva passa a usar uma
-- janela móvel dos assuntos mais recentes (sem coluna nova — ordem entre os
-- já estudados já basta, ver src/lib/janela-ativacao.ts) e cada disciplina
-- passa a intercalar sessões normais com Sessões de Consolidação: revisões
-- globais com pesos por camada de recência.

-- Quantos assuntos novos foram introduzidos nessa disciplina desde a última
-- Consolidação — decide quando a PRÓXIMA sessão dessa disciplina vira
-- Consolidação em vez de normal (ver deveSerConsolidacao), e também define o
-- corte do tier "alta" nela.
alter table disciplinas
  add column assuntos_desde_consolidacao int not null default 0
  check (assuntos_desde_consolidacao >= 0);

-- Toda sessão de hoje em diante é 'normal' (comportamento de sempre) ou
-- 'consolidacao' (revisão global, sem conteúdo novo).
alter table sessoes
  add column tipo text not null default 'normal'
  check (tipo in ('normal', 'consolidacao'));

-- Nova etapa: revisão do Caderno de Erros da disciplina, dentro da própria
-- Sessão de Consolidação (reaproveita a lógica de alternarRevisado do
-- Caderno de Erros, em lote pra disciplina inteira em vez de um grupo só).
alter type etapa_tipo add value 'revisao_erros';

-- Liga a etapa "Questões" de uma Sessão de Consolidação a VÁRIOS assuntos ao
-- mesmo tempo (hoje sessao_etapas.assunto_id só suporta um) — cada linha diz
-- em qual camada de recência (peso) aquele assunto entra na revisão daquela
-- etapa.
create table sessao_etapa_assuntos (
  etapa_id uuid not null references sessao_etapas(id) on delete cascade,
  assunto_id uuid not null references assuntos(id) on delete cascade,
  peso text not null check (peso in ('alta', 'media', 'baixa')),
  primary key (etapa_id, assunto_id)
);

create index if not exists idx_sessao_etapa_assuntos_etapa_id on sessao_etapa_assuntos (etapa_id);
create index if not exists idx_sessao_etapa_assuntos_assunto_id on sessao_etapa_assuntos (assunto_id);

alter table sessao_etapa_assuntos enable row level security;

create policy "sessao_etapa_assuntos: via sessao_etapas" on sessao_etapa_assuntos
  for all using (
    exists (
      select 1 from sessao_etapas se
      join sessoes s on s.id = se.sessao_id
      where se.id = sessao_etapa_assuntos.etapa_id and s.user_id = auth.uid()
    )
  );
