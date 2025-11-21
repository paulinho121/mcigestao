-- =====================================================
-- STOCKVISION - SUPABASE DATABASE SCHEMA
-- Sistema de Gestão de Estoque
-- =====================================================

-- =====================================================
-- 1. TABELA DE PRODUTOS (products)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,                    -- Código do produto (COD)
  name TEXT NOT NULL,                     -- Nome do produto
  brand TEXT NOT NULL,                    -- Marca
  stock_ce INTEGER NOT NULL DEFAULT 0,    -- Estoque Ceará
  stock_sc INTEGER NOT NULL DEFAULT 0,    -- Estoque Santa Catarina
  stock_sp INTEGER NOT NULL DEFAULT 0,    -- Estoque São Paulo
  total INTEGER NOT NULL DEFAULT 0,       -- Total de estoque
  reserved INTEGER NOT NULL DEFAULT 0,    -- Quantidade reservada
  import_quantity INTEGER,                -- Quantidade em importação
  expected_restock_date DATE,             -- Data prevista de reposição
  observations TEXT,                      -- Observações de manutenção
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_total ON public.products(total);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TABELA DE RESERVAS (reservations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,             -- Denormalizado para histórico
  product_brand TEXT NOT NULL,            -- Denormalizado para histórico
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_by TEXT NOT NULL,              -- Email do usuário
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reservations_product_id ON public.reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_reservations_reserved_by ON public.reservations(reserved_by);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- =====================================================
-- 3. TABELA DE PERFIS DE USUÁRIOS (profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_master BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, is_master)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    -- Define como master se for o email específico
    NEW.email = 'paulofernandoautomacao@gmail.com'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil quando usuário se registra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA PRODUCTS
-- =====================================================

-- Todos podem ler produtos
CREATE POLICY "Todos podem visualizar produtos"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas usuários master podem inserir produtos
CREATE POLICY "Apenas master pode inserir produtos"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_master = true
    )
  );

-- Apenas usuários master podem atualizar produtos
CREATE POLICY "Apenas master pode atualizar produtos"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_master = true
    )
  );

-- Apenas usuários master podem deletar produtos
CREATE POLICY "Apenas master pode deletar produtos"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- POLÍTICAS PARA RESERVATIONS
-- =====================================================

-- Usuários podem ver suas próprias reservas
CREATE POLICY "Usuários veem suas reservas"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    reserved_by = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_master = true
    )
  );

-- Usuários podem criar reservas
CREATE POLICY "Usuários podem criar reservas"
  ON public.reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (reserved_by = auth.jwt()->>'email');

-- Usuários podem atualizar suas próprias reservas
CREATE POLICY "Usuários atualizam suas reservas"
  ON public.reservations
  FOR UPDATE
  TO authenticated
  USING (
    reserved_by = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_master = true
    )
  );

-- Usuários podem deletar suas próprias reservas
CREATE POLICY "Usuários deletam suas reservas"
  ON public.reservations
  FOR DELETE
  TO authenticated
  USING (
    reserved_by = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_master = true
    )
  );

-- =====================================================
-- POLÍTICAS PARA PROFILES
-- =====================================================

-- Todos podem ver perfis
CREATE POLICY "Todos podem ver perfis"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários atualizam próprio perfil"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- 6. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para recalcular total de estoque
CREATE OR REPLACE FUNCTION calculate_total_stock()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total = NEW.stock_ce + NEW.stock_sc + NEW.stock_sp;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_product_total
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_stock();

-- =====================================================
-- 7. DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir produtos de exemplo (comentado - descomente se quiser dados de teste)
/*
INSERT INTO public.products (id, name, brand, stock_ce, stock_sc, stock_sp) VALUES
  ('PROD001', 'Produto Exemplo 1', 'Marca A', 10, 20, 30),
  ('PROD002', 'Produto Exemplo 2', 'Marca B', 5, 15, 25)
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
