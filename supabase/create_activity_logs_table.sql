-- =====================================================
-- TABELA DE LOGS DE ATIVIDADES
-- Sistema de auditoria para rastrear ações no sistema
-- =====================================================

-- Criar tabela de logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_email ON public.activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Habilitar RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas paulofernandoautomacao@gmail.com pode ler logs
DROP POLICY IF EXISTS "Only Paulo can read logs" ON public.activity_logs;
CREATE POLICY "Only Paulo can read logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'paulofernandoautomacao@gmail.com'
    )
  );

-- Política: Todos os usuários autenticados podem inserir logs
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Ninguém pode atualizar ou deletar logs (imutáveis)
DROP POLICY IF EXISTS "Logs are immutable" ON public.activity_logs;
CREATE POLICY "Logs are immutable"
  ON public.activity_logs
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Logs cannot be deleted" ON public.activity_logs;
CREATE POLICY "Logs cannot be deleted"
  ON public.activity_logs
  FOR DELETE
  USING (false);

-- Comentários para documentação
COMMENT ON TABLE public.activity_logs IS 'Logs de auditoria de todas as ações no sistema';
COMMENT ON COLUMN public.activity_logs.action_type IS 'Tipo de ação: stock_adjustment, product_created, reservation_created, etc';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Tipo de entidade: product, stock, reservation, rental, xml_upload, etc';
COMMENT ON COLUMN public.activity_logs.entity_id IS 'ID da entidade afetada';
COMMENT ON COLUMN public.activity_logs.details IS 'Detalhes específicos da ação em formato JSON';
COMMENT ON COLUMN public.activity_logs.metadata IS 'Metadados adicionais (IP, user agent, etc)';

-- Verificar se a tabela foi criada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'activity_logs'
ORDER BY ordinal_position;
