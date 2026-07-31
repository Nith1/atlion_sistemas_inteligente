-- Fase 2: modo de Validação (Simulado por Disciplina). Quando uma disciplina
-- esgota os assuntos novos (zero ja_estudado=false) e conclui sua última
-- Sessão de Consolidação, ela entra em modo de Validação: toda sessão dela
-- vira um Simulado — revisão de erros + questões cobrindo TODOS os assuntos,
-- pesados pela taxa de erro histórica em vez de por tier de recência (ver
-- src/lib/simulado.ts). Fecha o gap deixado pela Fase 1: sem essa flag,
-- deveSerConsolidacao() nunca mais dispara depois da última Consolidação.
alter table disciplinas
  add column em_validacao boolean not null default false;

-- 'validacao': mesmo pipeline de etapas de uma Consolidação (revisao_erros,
-- questoes), cobrindo todos os assuntos em vez de um subconjunto por tier.
-- O check da Fase 1 nasceu sem nome (Postgres nomeou sessoes_tipo_check) —
-- dropamos por esse nome com IF EXISTS por segurança e recriamos ampliado.
-- Nenhuma linha existente ('normal'/'consolidacao') deixa de ser válida.
alter table sessoes drop constraint if exists sessoes_tipo_check;
alter table sessoes
  add constraint sessoes_tipo_check check (tipo in ('normal', 'consolidacao', 'validacao'));

-- Simulado pesa cada assunto por um PERCENTUAL contínuo (taxa histórica de
-- erro), não pelo tier categórico da Consolidação — as duas formas não
-- convivem na mesma linha. Abordagem aditiva: nova coluna nullable só pra
-- Validação; `peso` (existente) continua exclusiva da Consolidação e deixa
-- de ser NOT NULL (nenhuma linha já gravada é afetada — todas já têm `peso`
-- preenchido, e um CHECK não rejeita NULL). O XOR garante no banco que uma
-- linha nunca tenha os dois pesos nem nenhum dos dois.
alter table sessao_etapa_assuntos alter column peso drop not null;

alter table sessao_etapa_assuntos
  add column peso_percentual numeric check (peso_percentual > 0 and peso_percentual <= 100);

alter table sessao_etapa_assuntos
  add constraint sessao_etapa_assuntos_peso_xor check (
    (peso is not null and peso_percentual is null) or
    (peso is null and peso_percentual is not null)
  );
