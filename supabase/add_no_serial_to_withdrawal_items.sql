-- Adicionar coluna no_serial para identificar itens que não possuem número de série
ALTER TABLE public.withdrawal_items 
ADD COLUMN IF NOT EXISTS no_serial BOOLEAN DEFAULT FALSE;

-- Comentário na coluna
COMMENT ON COLUMN public.withdrawal_items.no_serial IS 'Indica se o item foi retirado sem número de série';
