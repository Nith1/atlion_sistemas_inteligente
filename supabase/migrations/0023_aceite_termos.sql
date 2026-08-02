-- Registro de consentimento (LGPD): guarda quando e qual versão dos Termos
-- de Uso / Política de Privacidade o usuário aceitou, não só o fato de ter
-- marcado a caixinha na hora do cadastro. termos_versao guarda a data de
-- "última atualização" exibida em /termos-de-uso — se o documento mudar de
-- forma relevante, dá pra saber quem aceitou a versão antiga.
alter table profiles add column termos_aceitos_em timestamptz;
alter table profiles add column termos_versao text;
