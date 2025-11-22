-- =====================================================
-- MIGRATION: Adicionar Campo de Preço aos Produtos
-- Data: 2025-11-21
-- Descrição: Adiciona coluna price (DECIMAL) à tabela products
-- =====================================================

-- Adicionar coluna price à tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Criar índice para melhor performance em consultas de preço
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);

-- Comentário na coluna
COMMENT ON COLUMN public.products.price IS 'Preço de venda do produto em reais (R$)';

-- =====================================================
-- OPCIONAL: Atualizar alguns produtos de exemplo com preços
-- Descomente as linhas abaixo se quiser adicionar preços de teste
-- =====================================================

/*
UPDATE public.products 
SET price = 1250.00 
WHERE id = 'PROD001';

UPDATE public.products 
SET price = 899.90 
WHERE id = 'PROD002';
*/

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
