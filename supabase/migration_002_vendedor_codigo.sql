-- Adiciona campos de identificação ao salvar um orçamento: vendedor e código.
-- Rode isto uma vez em: painel Supabase → SQL Editor → New query → Run.

alter table orcamentos add column if not exists codigo text;
alter table orcamentos add column if not exists nome_vendedor text;
