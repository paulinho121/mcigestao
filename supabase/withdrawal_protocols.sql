-- =====================================================
-- PROTOCOLOS DE RETIRADA (withdrawal_protocols)
-- =====================================================

-- =====================================================
-- PROTOCOLOS DE RETIRADA (withdrawal_protocols) - Header
-- =====================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    branch TEXT NOT NULL CHECK (branch IN ('CE', 'SC', 'SP')),
    photo_url TEXT,
    user_email TEXT NOT NULL,
    invoice_number TEXT,
    master_memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ITENS DO PROTOCOLO (withdrawal_items) - Details
-- =====================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES public.withdrawal_protocols(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    serial_number TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_protocols_customer ON public.withdrawal_protocols(customer_name);
CREATE INDEX IF NOT EXISTS idx_withdrawal_protocols_created_at ON public.withdrawal_protocols(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_items_protocol_id ON public.withdrawal_items(protocol_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_items_product_id ON public.withdrawal_items(product_id);

-- Habilitar RLS
ALTER TABLE public.withdrawal_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem visualizar protocolos" ON public.withdrawal_protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários podem criar protocolos" ON public.withdrawal_protocols FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Apenas master pode deletar protocolos" ON public.withdrawal_protocols FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE));

CREATE POLICY "Todos podem visualizar itens" ON public.withdrawal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários podem criar itens" ON public.withdrawal_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Apenas master pode deletar itens" ON public.withdrawal_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE));


-- Comentários
COMMENT ON TABLE public.withdrawal_protocols IS 'Registro de protocolos de saída/retirada de clientes';

-- =====================================================
-- TRIGGER PARA DEDUÇÃO AUTOMÁTICA DE ESTOQUE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_withdrawal_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_branch TEXT;
    v_column_name TEXT;
BEGIN
    -- Obter a filial do protocolo pai
    SELECT branch INTO v_branch FROM public.withdrawal_protocols WHERE id = NEW.protocol_id;
    
    -- Determinar qual coluna de estoque atualizar
    v_column_name := 'stock_' || lower(v_branch);

    -- Atualizar o estoque na tabela de produtos
    EXECUTE format('UPDATE public.products SET %I = %I - $1 WHERE id = $2', v_column_name, v_column_name)
    USING NEW.quantity, NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_withdrawal_item_created
    AFTER INSERT ON public.withdrawal_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_withdrawal_deduction();


-- Configuração do Storage (Bucket para fotos de retirada)
-- Nota: Isso geralmente é feito via Dashboard do Supabase, mas deixamos registrado aqui.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('withdrawals', 'withdrawals', true) ON CONFLICT (id) DO NOTHING;
