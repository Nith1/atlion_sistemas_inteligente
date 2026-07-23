-- Schema inicial do Atlion: onboarding, disciplinas/assuntos, sessões adaptativas e
-- registro de questões (base do Caderno de Erros e das Estatísticas).

create extension if not exists "pgcrypto";

create type disciplina_tipo as enum ('juridica', 'exatas', 'humanas', 'informatica', 'idiomas', 'personalizada');
create type ativacao_modo as enum ('questoes', 'anki', 'questoes_anki');
create type etapa_tipo as enum ('ativacao_cognitiva', 'estudo', 'lei_seca', 'jurisprudencia', 'exercicios', 'laboratorio', 'questoes');
create type sessao_status as enum ('em_andamento', 'concluida');

-- perfil do estudante (1:1 com auth.users), preenchido no onboarding
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  concurso text,
  tem_edital boolean not null default false,
  horas_liquidas_dia numeric,
  trabalha boolean not null default false,
  curso_preparatorio text,
  ativacao_modo ativacao_modo not null default 'questoes',
  onboarding_completo boolean not null default false,
  created_at timestamptz not null default now()
);

-- disciplinas cadastradas pelo estudante
create table disciplinas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo disciplina_tipo not null default 'personalizada',
  ordem int not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

-- assuntos de cada disciplina — ja_estudado/ultima_vez_estudado alimentam a Ativação Cognitiva
create table assuntos (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references disciplinas(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  ja_estudado boolean not null default false,
  ultima_vez_estudado timestamptz,
  created_at timestamptz not null default now()
);

-- uma sessão por "Estudar Agora"
create table sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  disciplina_id uuid not null references disciplinas(id) on delete cascade,
  status sessao_status not null default 'em_andamento',
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz
);

-- etapas dentro da sessão, na ordem que a Sessão Adaptativa define pro tipo de disciplina
create table sessao_etapas (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes(id) on delete cascade,
  tipo etapa_tipo not null,
  ordem int not null,
  concluida boolean not null default false,
  concluida_em timestamptz
);

-- registro de questões: base do Caderno de Erros e das Estatísticas (agregadas em cima disso)
create table questoes_registro (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  disciplina_id uuid not null references disciplinas(id) on delete cascade,
  assunto_id uuid references assuntos(id) on delete set null,
  sessao_id uuid references sessoes(id) on delete set null,
  acertou boolean not null,
  anotacao text,
  created_at timestamptz not null default now()
);

-- cria o profile automaticamente quando um usuário se cadastra
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: cada usuário só acessa os próprios dados
alter table profiles enable row level security;
alter table disciplinas enable row level security;
alter table assuntos enable row level security;
alter table sessoes enable row level security;
alter table sessao_etapas enable row level security;
alter table questoes_registro enable row level security;

create policy "profiles: proprio usuario" on profiles
  for all using (auth.uid() = id);

create policy "disciplinas: proprio usuario" on disciplinas
  for all using (auth.uid() = user_id);

create policy "assuntos: via disciplina" on assuntos
  for all using (
    exists (select 1 from disciplinas d where d.id = assuntos.disciplina_id and d.user_id = auth.uid())
  );

create policy "sessoes: proprio usuario" on sessoes
  for all using (auth.uid() = user_id);

create policy "sessao_etapas: via sessao" on sessao_etapas
  for all using (
    exists (select 1 from sessoes s where s.id = sessao_etapas.sessao_id and s.user_id = auth.uid())
  );

create policy "questoes_registro: proprio usuario" on questoes_registro
  for all using (auth.uid() = user_id);
