-- Cronômetro por etapa: guarda quando a etapa atual começou (pra calcular o
-- tempo ao vivo) e quanto tempo foi gasto de fato quando ela é concluída.
alter table sessao_etapas
  add column iniciada_em timestamptz,
  add column tempo_gasto_segundos int;

-- Lei Seca e Jurisprudência precisam saber QUAL lei/tema e ONDE o estudante
-- parou da última vez, pra ele só se preocupar em ler o trecho indicado.
alter table assuntos
  add column lei_referencia text,
  add column progresso_lei_seca text,
  add column jurisprudencia_referencia text,
  add column progresso_jurisprudencia text;
