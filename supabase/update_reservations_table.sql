-- Adicionar colunas para suportar as novas funcionalidades de reserva

-- 1. Adicionar coluna 'branch' para saber de qual filial é a reserva
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS branch TEXT CHECK (branch IN ('CE', 'SC', 'SP'));

-- 2. Adicionar coluna 'reserved_by_name' para salvar o nome do usuário
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS reserved_by_name TEXT;

-- 3. Atualizar as políticas de segurança (RLS) para permitir que usuários vejam nomes nas reservas
-- (As políticas existentes já cobrem SELECT para autenticados, então isso deve funcionar automaticamente)
