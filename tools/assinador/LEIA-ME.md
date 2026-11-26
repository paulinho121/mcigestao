# Assinador MCI

Programa local que permite ao app assinar contratos em PDF com o certificado digital A3 (token/pendrive).
O navegador não enxerga o token; este programa roda só no seu computador (127.0.0.1) e pede ao Windows
para assinar. A chave privada nunca sai do token e o PIN é pedido pela janela do fabricante.

## Uso
1. Instale o driver do token (o mesmo que você já usa para assinar no Windows) e conecte o pendrive.
2. Dê duplo clique em `Assinador-MCI.bat` e **deixe a janela aberta**.
3. No app: Locação → Contratos → ícone de caneta → "Assinar e baixar PDF".

## Detalhes
- Porta `47890`. Só aceita pedidos do app (`estoquemci.vercel.app` e `localhost`); veja `$OrigensPermitidas` no `assinador.ps1`.
- Assinatura CMS destacada (SHA-256) com `signing-certificate-v2` — PDF no formato `adbe.pkcs7.detached` (PAdES).
- Lista os certificados do repositório pessoal do Windows; o do token é marcado e escolhido por padrão.
- Teste sem token: `.\assinador.ps1 -PfxTeste arquivo.pfx -SenhaTeste senha`.
- Banco: rode `supabase/add_contratos_assinatura.sql` uma vez para guardar o PDF assinado no contrato.
