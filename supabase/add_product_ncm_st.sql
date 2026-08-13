-- Adiciona NCM e situação de Substituição Tributária (ICMS-ST) em SP por produto
-- Fonte planejada: API de cadastro de produtos da Sanco/Escalasoft (endpoint
-- ainda não localizado — ver supabase/functions/README ou pedir ao TI).
-- st_sp fica NULL ("não determinado") até o NCM real ser conferido contra a
-- legislação de ST de SP (Convênio ICMS 142/2018 + Portaria CAT-68/2019) —
-- não deve ser inferido por uma regra genérica, tem muita exceção por segmento.
-- Rodar no SQL Editor do Supabase

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS st_sp BOOLEAN;

COMMENT ON COLUMN public.products.ncm IS 'Código NCM (Nomenclatura Comum do Mercosul) do produto';
COMMENT ON COLUMN public.products.st_sp IS 'Sujeito a Substituição Tributária (ICMS-ST) para o estado de SP. NULL = não determinado ainda.';
