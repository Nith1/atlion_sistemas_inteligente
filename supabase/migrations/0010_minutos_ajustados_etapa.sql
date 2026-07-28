-- Ajuste manual de tempo por etapa: sobrepõe o cálculo automático
-- (MINUTOS_SUGERIDOS * sessoes.ajuste_tempo) quando a pessoa edita o tempo
-- de uma etapa específica na tela "Sua preparação está pronta". Null =
-- segue o cálculo automático (o padrão).
alter table sessao_etapas
  add column minutos_ajustados int;
