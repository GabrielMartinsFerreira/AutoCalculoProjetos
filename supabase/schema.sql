-- AutoCalculoConceito — tabela de orçamentos salvos.
-- Rode isto uma vez em: painel Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('detalhado', 'simplificado')),
  nome_cliente text,
  total numeric,
  dados jsonb not null,
  criado_em timestamptz not null default now()
);

create index if not exists orcamentos_criado_em_idx on orcamentos (criado_em desc);

-- RLS ligado e sem policies: só a secret key (usada exclusivamente no servidor,
-- em app/api/orcamentos) consegue ler/escrever — ela ignora RLS por padrão.
-- Mesmo que a chave pública (anon) algum dia seja usada no navegador, esta
-- tabela continua inacessível a partir dela.
alter table orcamentos enable row level security;
