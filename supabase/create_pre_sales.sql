-- =====================================================
-- TABELA DE PRÉ-VENDA
-- Gerenciamento de itens vendidos sem estoque disponível
-- Acesso restrito a usuários master
-- =====================================================

-- Tabela principal de pré-vendas
CREATE TABLE IF NOT EXISTS public.pre_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Produto
    product_id    TEXT NOT NULL,
    product_name  TEXT NOT NULL,
    product_brand TEXT,
    quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price    NUMERIC(10,2),

    -- Organização (labels do admin)
    vendedor_name   TEXT NOT NULL,
    cliente_name    TEXT NOT NULL,
    cliente_contact TEXT,
    branch          TEXT CHECK (branch IN ('CE','SC','SP')),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','stock_arrived','fulfilled','cancelled')),

    -- Datas
    expected_restock_date DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ,

    -- Extras
    notes    TEXT,
    priority TEXT DEFAULT 'normal'
        CHECK (priority IN ('low','normal','high','urgent'))
);

-- Tabela de alertas gerados quando o estoque entra
CREATE TABLE IF NOT EXISTS public.pre_sale_alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pre_sale_id UUID REFERENCES public.pre_sales(id) ON DELETE CASCADE,
    product_id  TEXT,
    product_name TEXT,
    stock_delta INTEGER,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pre_sales_product_id ON public.pre_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_pre_sales_status ON public.pre_sales(status);
CREATE INDEX IF NOT EXISTS idx_pre_sales_product_status ON public.pre_sales(product_id, status);
CREATE INDEX IF NOT EXISTS idx_pre_sales_vendedor ON public.pre_sales(vendedor_name);
CREATE INDEX IF NOT EXISTS idx_pre_sales_cliente ON public.pre_sales(cliente_name);
CREATE INDEX IF NOT EXISTS idx_pre_sale_alerts_read ON public.pre_sale_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_pre_sale_alerts_pre_sale ON public.pre_sale_alerts(pre_sale_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pre_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pre_sales_updated_at ON public.pre_sales;
CREATE TRIGGER trg_pre_sales_updated_at
    BEFORE UPDATE ON public.pre_sales
    FOR EACH ROW EXECUTE FUNCTION update_pre_sales_updated_at();

-- Habilitar RLS
ALTER TABLE public.pre_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_sale_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas: somente usuários autenticados (o controle de master é feito no frontend)
DROP POLICY IF EXISTS "Authenticated users can manage pre_sales" ON public.pre_sales;
CREATE POLICY "Authenticated users can manage pre_sales"
    ON public.pre_sales FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage pre_sale_alerts" ON public.pre_sale_alerts;
CREATE POLICY "Authenticated users can manage pre_sale_alerts"
    ON public.pre_sale_alerts FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
