-- Nova etapa "descanso": pausa curta entre Estudo e a próxima etapa (Lei
-- Seca/Jurisprudência/Exercícios), conforme o método real do Atlion.
alter type etapa_tipo add value 'descanso';

-- Registro do que aconteceu na Ativação Cognitiva desta sessão (questões
-- certas/erradas e se revisou no Anki), conforme o modo escolhido no perfil.
alter table sessao_etapas
  add column ativacao_certas int,
  add column ativacao_erradas int,
  add column ativacao_anki boolean;
