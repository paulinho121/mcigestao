-- Adiciona coluna brand_logo na tabela de produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_logo TEXT;
