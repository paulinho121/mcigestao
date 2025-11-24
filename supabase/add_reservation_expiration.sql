-- =====================================================
-- Adicionar Expiração Automática de Reservas (7 dias)
-- =====================================================

-- 1. Adicionar coluna de expiração
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Atualizar reservas existentes para terem data de expiração (7 dias após criação)
UPDATE public.reservations
SET expires_at = reserved_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- 3. Criar índice para melhorar performance de consultas de expiração
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.reservations(expires_at);

-- =====================================================
-- Função para limpar reservas expiradas
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER := 0;
  expired_rec RECORD;
BEGIN
  -- Buscar reservas expiradas ativas
  FOR expired_rec IN 
    SELECT id, product_id, quantity, branch
    FROM public.reservations
    WHERE expires_at < NOW()
    AND status = 'active'
  LOOP
    -- Restaurar estoque do produto
    UPDATE public.products
    SET 
      stock_ce = CASE WHEN expired_rec.branch = 'CE' THEN stock_ce + expired_rec.quantity ELSE stock_ce END,
      stock_sc = CASE WHEN expired_rec.branch = 'SC' THEN stock_sc + expired_rec.quantity ELSE stock_sc END,
      stock_sp = CASE WHEN expired_rec.branch = 'SP' THEN stock_sp + expired_rec.quantity ELSE stock_sp END,
      reserved = GREATEST(0, reserved - expired_rec.quantity),
      total = stock_ce + stock_sc + stock_sp
    WHERE id = expired_rec.product_id;
    
    -- Marcar reserva como cancelada
    UPDATE public.reservations
    SET status = 'cancelled'
    WHERE id = expired_rec.id;
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comentários
-- =====================================================
COMMENT ON COLUMN public.reservations.expires_at IS 'Data de expiração da reserva (7 dias após criação)';
COMMENT ON FUNCTION cleanup_expired_reservations() IS 'Cancela reservas expiradas e restaura o estoque dos produtos';

-- =====================================================
-- Instruções de Uso
-- =====================================================
-- Para executar a limpeza manualmente:
-- SELECT cleanup_expired_reservations();
--
-- Para agendar execução automática (requer pg_cron extension):
-- SELECT cron.schedule('cleanup-expired-reservations', '0 * * * *', 'SELECT cleanup_expired_reservations();');
