-- =====================================================
-- MÓDULO DE GESTÃO INTELIGENTE DE COMPRAS (GIC)
-- =====================================================

-- 1. Marcas (Brands)
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vincular Produtos a Marcas (se não estiver vinculado corretamente)
-- Nota: A tabela products já tem coluna brand (TEXT). Vamos manter por compatibilidade, 
-- mas poderíamos migrar para brand_id se necessário. Para este módulo, usaremos TEXT para manter simplicidade com o código existente.

-- 3. Fornecedores x Marcas (N:N)
CREATE TABLE IF NOT EXISTS public.supplier_brands (
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL, -- Usando o nome da marca para simplificar com o esquema atual
    PRIMARY KEY (supplier_id, brand_name)
);

-- 4. Extensão da Tabela de Produtos para Inteligência
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS safety_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_consumption_daily DECIMAL(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS abc_category CHAR(1) CHECK (abc_category IN ('A', 'B', 'C')),
ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(10,2);

-- 5. Histórico de Preços
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Recebimentos Parciais
CREATE TABLE IF NOT EXISTS public.partial_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
    quantity_received INTEGER NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    received_by TEXT, -- Email do usuário
    invoice_number TEXT
);

-- 7. Avaliação de Fornecedores
CREATE TABLE IF NOT EXISTS public.supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    delivery_score INTEGER CHECK (delivery_score BETWEEN 1 AND 5),
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
    pricing_score INTEGER CHECK (pricing_score BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Movimentação de Estoque (Se não existir)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    location TEXT, -- 'CE', 'SC', 'SP'
    reference_id TEXT, -- ID do Pedido ou Venda
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- 9. Evolução da Tabela Purchase Orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Atualizar purchase_order_items para suportar recebimento parcial
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS quantity_received INTEGER DEFAULT 0;

-- 10. RLS Policies
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partial_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público temporário marcas" ON public.brands FOR ALL USING (true);
CREATE POLICY "Acesso público temporário supplier_brands" ON public.supplier_brands FOR ALL USING (true);
CREATE POLICY "Acesso público temporário price_history" ON public.price_history FOR ALL USING (true);
CREATE POLICY "Acesso público temporário partial_receipts" ON public.partial_receipts FOR ALL USING (true);
CREATE POLICY "Acesso público temporário evaluations" ON public.supplier_evaluations FOR ALL USING (true);
CREATE POLICY "Acesso público temporário inventory_logs" ON public.inventory_logs FOR ALL USING (true);
