-- Execute este SQL no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Cole este código > Run

INSERT INTO products (id, name, brand, stock_ce, stock_sc, stock_sp, total, reserved)
VALUES (
    'GENERICO-001',
    'Produto Genérico - Item Sem Código',
    'N/A',
    0,
    0,
    0,
    0,
    0
)
ON CONFLICT (id) DO NOTHING;

-- Verificar se foi inserido
SELECT * FROM products WHERE id = 'GENERICO-001';
