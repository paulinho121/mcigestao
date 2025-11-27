-- =====================================================
-- TORNAR logisticasp@mcistore.com.br MASTER USER
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Opção 1: Se o usuário já existe no sistema
UPDATE public.profiles
SET is_master = true
WHERE email = 'logisticasp@mcistore.com.br';

-- Opção 2: Se precisar criar o perfil manualmente (caso não exista)
-- Primeiro, encontre o UUID do usuário em Authentication > Users
-- Depois execute (substitua 'USER_UUID_AQUI' pelo UUID real):
/*
INSERT INTO public.profiles (id, email, name, is_master)
VALUES (
  'USER_UUID_AQUI',
  'logisticasp@mcistore.com.br',
  'Logística SP',
  true
)
ON CONFLICT (id) DO UPDATE
SET is_master = true;
*/

-- Verificar se funcionou
SELECT id, email, name, is_master, created_at
FROM public.profiles
WHERE email = 'logisticasp@mcistore.com.br';

-- =====================================================
-- INSTRUÇÕES
-- =====================================================
-- 1. Primeiro, crie uma conta no app com o email logisticasp@mcistore.com.br
-- 2. Depois, execute a Opção 1 acima no SQL Editor do Supabase
-- 3. Execute a query de verificação para confirmar
-- 4. Faça logout e login novamente no app
-- 5. As abas de administração devem aparecer para este usuário
