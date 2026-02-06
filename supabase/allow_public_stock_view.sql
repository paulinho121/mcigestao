-- Permite que usuários não autenticados (visitantes do link de compartilhamento) 
-- possam ver as informações dos produtos.

-- Primeiro, removemos a política existente que restringia a autenticados
DROP POLICY IF EXISTS "Todos podem visualizar produtos" ON public.products;

-- Criamos a nova política que permite acesso tanto para autenticados quanto anonimos
CREATE POLICY "Produtos visíveis para todos"
ON public.products
FOR SELECT
USING (true);

-- Nota: Como o sistema usa o link #/share/ID, o visitante só verá o card 
-- do produto específico se tiver o link, mas tecnicamente a tabela agora 
-- permite leitura pública (apenas leitura).
