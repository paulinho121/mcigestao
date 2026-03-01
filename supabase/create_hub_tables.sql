-- =====================================================
-- HUB - MARKETPLACE B2B ENTRE LOCADORAS
-- Sistema de Solicitação de Reserva Inter-locadoras
-- =====================================================

-- =====================================================
-- 1. TABELA DE EMPRESAS LOCADORAS (hub_companies)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hub_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,                  -- Razão social
  fantasy_name TEXT NOT NULL,          -- Nome fantasia (exibido no catálogo)
  email TEXT UNIQUE NOT NULL,          -- Email de login
  phone TEXT,                          -- Telefone de contato
  city TEXT,                           -- Cidade
  state TEXT,                          -- Estado (UF)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_companies_email ON public.hub_companies(email);
CREATE INDEX IF NOT EXISTS idx_hub_companies_auth_user ON public.hub_companies(auth_user_id);

-- =====================================================
-- 2. TABELA DE PRODUTOS DAS LOCADORAS (hub_products)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hub_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.hub_companies(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,          -- Código do produto (ex: "4303", "300C")
  product_name TEXT NOT NULL,          -- Nome descritivo
  brand TEXT,                          -- Marca
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_total INTEGER NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
  description TEXT,                    -- Descrição adicional
  image_url TEXT,                      -- URL da imagem
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_products_company ON public.hub_products(company_id);
CREATE INDEX IF NOT EXISTS idx_hub_products_code ON public.hub_products(product_code);
CREATE INDEX IF NOT EXISTS idx_hub_products_active ON public.hub_products(is_active);

-- =====================================================
-- 3. TABELA DE SOLICITAÇÕES DE RESERVA (hub_reservation_requests)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hub_reservation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_company_id UUID NOT NULL REFERENCES public.hub_companies(id),
  providing_company_id UUID NOT NULL REFERENCES public.hub_companies(id),
  hub_product_id UUID NOT NULL REFERENCES public.hub_products(id),
  product_name TEXT NOT NULL,          -- Denormalizado para histórico
  product_code TEXT NOT NULL,          -- Denormalizado para histórico
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'in_transit', 'delivered', 'cancelled')
  ),
  notes TEXT,                          -- Observações da locadora solicitante
  admin_notes TEXT,                    -- Observações da MCI (admin)
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_requests_requesting ON public.hub_reservation_requests(requesting_company_id);
CREATE INDEX IF NOT EXISTS idx_hub_requests_providing ON public.hub_reservation_requests(providing_company_id);
CREATE INDEX IF NOT EXISTS idx_hub_requests_status ON public.hub_reservation_requests(status);
CREATE INDEX IF NOT EXISTS idx_hub_requests_product ON public.hub_reservation_requests(hub_product_id);

-- =====================================================
-- 4. TRIGGERS DE updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_hub_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hub_companies_updated_at
  BEFORE UPDATE ON public.hub_companies
  FOR EACH ROW EXECUTE FUNCTION update_hub_updated_at();

CREATE TRIGGER trg_hub_products_updated_at
  BEFORE UPDATE ON public.hub_products
  FOR EACH ROW EXECUTE FUNCTION update_hub_updated_at();

CREATE TRIGGER trg_hub_requests_updated_at
  BEFORE UPDATE ON public.hub_reservation_requests
  FOR EACH ROW EXECUTE FUNCTION update_hub_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.hub_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_reservation_requests ENABLE ROW LEVEL SECURITY;

-- *** hub_companies ***
-- Usuários autenticados veem todas as empresas ativas (para o catálogo)
CREATE POLICY "hub_companies_select_authenticated"
  ON public.hub_companies FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Apenas master pode inserir/editar/deletar empresas
CREATE POLICY "hub_companies_insert_master"
  ON public.hub_companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

CREATE POLICY "hub_companies_update_master"
  ON public.hub_companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "hub_companies_delete_master"
  ON public.hub_companies FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

-- *** hub_products ***
-- Todos os usuários hub autenticados podem ver produtos ativos de qualquer empresa
CREATE POLICY "hub_products_select_all"
  ON public.hub_products FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Cada locadora pode inserir seus próprios produtos
CREATE POLICY "hub_products_insert_own"
  ON public.hub_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hub_companies
      WHERE id = company_id AND auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

-- Cada locadora pode editar seus próprios produtos
CREATE POLICY "hub_products_update_own"
  ON public.hub_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hub_companies
      WHERE id = company_id AND auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

-- Cada locadora pode deletar seus próprios produtos
CREATE POLICY "hub_products_delete_own"
  ON public.hub_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hub_companies
      WHERE id = company_id AND auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

-- *** hub_reservation_requests ***
-- Cada locadora vê as solicitações que fez OU que recebeu. Master vê tudo.
CREATE POLICY "hub_requests_select"
  ON public.hub_reservation_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hub_companies
      WHERE (id = requesting_company_id OR id = providing_company_id)
      AND auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

-- Locadoras podem criar solicitações (apenas como requesting_company)
CREATE POLICY "hub_requests_insert"
  ON public.hub_reservation_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hub_companies
      WHERE id = requesting_company_id AND auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
  );

-- Apenas master pode atualizar status das solicitações
CREATE POLICY "hub_requests_update_master"
  ON public.hub_reservation_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = TRUE)
    OR EXISTS (
      SELECT 1 FROM public.hub_companies
      WHERE id = requesting_company_id AND auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. FUNÇÃO PARA VINCULAR USUÁRIO AUTH A HUB COMPANY
-- =====================================================
-- Após criar um usuário no Supabase Auth para uma locadora,
-- execute: SELECT link_hub_user('user-uuid-aqui', 'company-uuid-aqui');
CREATE OR REPLACE FUNCTION public.link_hub_user(p_auth_user_id UUID, p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.hub_companies
  SET auth_user_id = p_auth_user_id
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIM DO SCRIPT HUB
-- =====================================================
