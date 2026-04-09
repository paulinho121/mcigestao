-- =====================================================
-- GESTÃO DE ESTOQUE - LOCALIZAÇÃO E MOVIMENTAÇÃO
-- =====================================================

-- 1. Adicionar coluna de localização na tabela de produtos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Tabela de movimentações internas (Amostras, Demonstrações)
CREATE TABLE IF NOT EXISTS public.internal_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('amostra', 'demonstracao')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    branch TEXT NOT NULL CHECK (branch IN ('CE', 'SC', 'SP')),
    user_email TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_internal_movements_product_id ON public.internal_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_internal_movements_type ON public.internal_movements(type);
CREATE INDEX IF NOT EXISTS idx_internal_movements_branch ON public.internal_movements(branch);

-- Habilitar RLS
ALTER TABLE public.internal_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem visualizar movimentações internas"
ON public.internal_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem criar movimentações internas"
ON public.internal_movements FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.internal_movements IS 'Registro de movimentações internas como amostras e demonstrações';
