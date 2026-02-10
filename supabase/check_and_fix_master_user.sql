-- =====================================================
-- VERIFICAR E CORRIGIR PERMISSÕES DE USUÁRIO MASTER
-- =====================================================

-- 1. Verificar todos os perfis existentes
SELECT 
    id,
    email,
    name,
    is_master,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 2. Verificar se você está autenticado (execute isso no Supabase SQL Editor)
SELECT auth.uid() as my_user_id, auth.jwt()->>'email' as my_email;

-- 3. Marcar seu usuário como master (SUBSTITUA 'seu-email@exemplo.com' pelo seu email real)
-- Opção A: Se você souber seu email
UPDATE public.profiles
SET is_master = true
WHERE email = 'paulofernandoautomacao@gmail.com';

-- Opção B: Se você souber seu ID de usuário
-- UPDATE public.profiles
-- SET is_master = true
-- WHERE id = auth.uid();

-- 4. Verificar se a atualização funcionou
SELECT 
    email,
    is_master
FROM public.profiles
WHERE email IN ('paulofernandoautomacao@gmail.com', 'felipe@mcistore.com.br', 'bianca@mcistore.com.br');

-- =====================================================
-- NOTA IMPORTANTE:
-- Se você não vê seu perfil na tabela profiles, significa que:
-- 1. Você não está autenticado no Supabase
-- 2. O trigger de criação de perfil não funcionou
-- 
-- Nesse caso, você precisa criar o perfil manualmente ou
-- fazer login novamente na aplicação
-- =====================================================
