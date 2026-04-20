-- =====================================================
-- PROTOCOLOS DE RETIRADA (withdrawal_protocols)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    branch TEXT NOT NULL CHECK (branch IN ('CE', 'SC', 'SP')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    serial_number TEXT,
    observations TEXT,
    photo_url TEXT,
    user_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_protocols_product_id ON public.withdrawal_protocols(product_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_protocols_customer ON public.withdrawal_protocols(customer_name);
CREATE INDEX IF NOT EXISTS idx_withdrawal_protocols_created_at ON public.withdrawal_protocols(created_at);

-- Habilitar RLS
ALTER TABLE public.withdrawal_protocols ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem visualizar protocolos de retirada"
ON public.withdrawal_protocols FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem criar protocolos de retirada"
ON public.withdrawal_protocols FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Apenas master pode deletar protocolos"
ON public.withdrawal_protocols FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE));

-- Comentários
COMMENT ON TABLE public.withdrawal_protocols IS 'Registro de protocolos de saída/retirada de clientes';

-- =====================================================
-- TRIGGER PARA DEDUÇÃO AUTOMÁTICA DE ESTOQUE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_withdrawal_deduction()
RETURNS TRIGGER AS $$
DECLARE
    column_name TEXT;
BEGIN
    -- Determinar qual coluna de estoque atualizar
    column_name := 'stock_' || lower(NEW.branch);

    -- Atualizar o estoque na tabela de produtos
    -- O trigger 'calculate_product_total' na tabela products cuidará de atualizar o 'total'
    EXECUTE format('UPDATE public.products SET %I = %I - $1 WHERE id = $2', column_name, column_name)
    USING NEW.quantity, NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_withdrawal_created
    AFTER INSERT ON public.withdrawal_protocols
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_withdrawal_deduction();

-- Configuração do Storage (Bucket para fotos de retirada)
-- Nota: Isso geralmente é feito via Dashboard do Supabase, mas deixamos registrado aqui.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('withdrawals', 'withdrawals', true) ON CONFLICT (id) DO NOTHING;
