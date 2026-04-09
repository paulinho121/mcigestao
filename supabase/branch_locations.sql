-- Adicionar colunas de localização por filial na tabela de produtos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS location_ce TEXT,
ADD COLUMN IF NOT EXISTS location_sc TEXT,
ADD COLUMN IF NOT EXISTS location_sp TEXT;

-- Migrar dados existentes da coluna 'location' genérica para a do Ceará como padrão (opcional)
UPDATE public.products 
SET location_ce = location 
WHERE location_ce IS NULL AND location IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.products.location_ce IS 'Localização física do item na filial Ceará';
COMMENT ON COLUMN public.products.location_sc IS 'Localização física do item na filial Santa Catarina';
COMMENT ON COLUMN public.products.location_sp IS 'Localização física do item na filial São Paulo';
