-- Adicionar produto genérico para itens sem código
-- Este produto pode ser usado para cadastrar itens novos que ainda não têm código no sistema

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
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand;

-- Verificar se o produto foi inserido
SELECT * FROM products WHERE id = 'GENERICO-001';
