-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    brands TEXT[], -- Array of brands this supplier handles
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update Purchase Orders to reference Supplier
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Simple public policies
CREATE POLICY "Allow all access to suppliers" ON suppliers FOR ALL USING (true);

-- Insert some mock suppliers based on existing brands
INSERT INTO suppliers (name, cnpj, email, brands) 
VALUES 
('Aputure Brasil Distribuidora', '12.345.678/0001-90', 'vendas@aputure.com.br', ARRAY['Aputure']),
('Sony Professional Brasil', '98.765.432/0001-21', 'comercial@sony.com.br', ARRAY['Sony']),
('Samyang Optics Partner', '45.678.901/0001-34', 'contato@samyang.com.br', ARRAY['Samyang']);
