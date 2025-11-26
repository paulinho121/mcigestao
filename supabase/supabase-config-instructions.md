# Configuração do Supabase para Confirmação de Email

Este documento descreve como configurar o Supabase para redirecionar usuários para a página de confirmação de email após o cadastro.

## Configurações Necessárias

### 1. URL de Redirecionamento

No painel do Supabase:

1. Acesse **Authentication** → **URL Configuration**
2. Em **Redirect URLs**, adicione a URL do seu aplicativo:
   - Para desenvolvimento local: `http://localhost:5173`
   - Para produção: `https://seudominio.com`

### 2. Template de Email

No painel do Supabase:

1. Acesse **Authentication** → **Email Templates**
2. Selecione **Confirm signup**
3. O template padrão já deve funcionar, mas você pode personalizar se desejar

O link de confirmação no email automaticamente incluirá os parâmetros necessários (`access_token` e `type=signup`) que o `AppRouter` detecta.

### 3. Variáveis de Ambiente

Certifique-se de que as seguintes variáveis de ambiente estão configuradas:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

## Fluxo de Confirmação

1. **Usuário se cadastra**: Preenche o formulário de registro
2. **Email enviado**: Supabase envia email com link de confirmação
3. **Usuário clica no link**: É redirecionado para `http://localhost:5173/#access_token=...&type=signup...`
4. **AppRouter detecta**: Verifica os parâmetros da URL e mostra a página de confirmação
5. **Confirmação processada**: `EmailConfirmation` component verifica o status
6. **Redirecionamento**: Após 5 segundos, redireciona para login

## Testando

Para testar o fluxo completo:

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:5173`

3. Clique em "Registrar" e crie uma nova conta

4. Verifique seu email e clique no link de confirmação

5. Você deve ser redirecionado para a página de confirmação com uma mensagem de sucesso

## Troubleshooting

### Email não chega

- Verifique a pasta de spam
- Confirme que o email está configurado corretamente no Supabase
- Verifique os logs do Supabase em **Authentication** → **Logs**

### Redirecionamento não funciona

- Certifique-se de que a URL está na lista de **Redirect URLs** no Supabase
- Verifique o console do navegador para erros
- Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos

### Página de confirmação não aparece

- Verifique se o `AppRouter` está sendo usado no `index.tsx`
- Confirme que os parâmetros `access_token` e `type` estão na URL
- Verifique o console para erros

## Notas Importantes

- A confirmação de email é **obrigatória** por padrão no Supabase
- Usuários não conseguirão fazer login até confirmarem o email
- O link de confirmação expira após 24 horas (configurável no Supabase)
- Você pode reenviar o email de confirmação através do painel do Supabase se necessário
