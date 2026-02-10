-- =====================================================
-- TORNAR USUÁRIOS MCISTORE MASTER
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Tentar atualizar os usuários felipe@mcistore.com.br e bianca@mcistore.com.br
UPDATE public.profiles
SET is_master = true
WHERE email IN (
  'felipe@mcistore.com.br',
  'bianca@mcistore.com.br'
);

-- 2. Verificar se a atualização funcionou
SELECT id, email, name, is_master, created_at
FROM public.profiles
WHERE email IN (
  'felipe@mcistore.com.br',
  'bianca@mcistore.com.br'
);

-- =====================================================
-- INSTRUÇÕES
-- =====================================================
-- 1. Se os usuários já criaram suas contas, o script acima funcionará.
-- 2. Se os usuários ainda NÃO criaram suas contas, peça para eles:
--    a) Criar a conta no aplicativo normalmente.
--    b) Após a criação, execute este script novamente.
-- 3. Faça logout e login novamente no app para ver as mudanças.
