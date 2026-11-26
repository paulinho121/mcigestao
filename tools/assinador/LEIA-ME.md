# Assinador MCI

Programa local que permite ao app assinar contratos em PDF com o certificado digital A3 (token/pendrive).
O navegador não enxerga o token; este programa roda só no seu computador (127.0.0.1) e pede ao Windows
para assinar. A chave privada nunca sai do token e o PIN é pedido pela janela do fabricante.

## Instalação (uma vez só)
1. Dê duplo clique em `Instalar-Assinador-MCI.bat`. Não precisa de administrador.
2. Pronto: o Assinador passa a abrir sozinho, escondido, sempre que o Windows iniciar.
3. No app: Locação → Contratos → ícone de caneta → "Assinar e baixar PDF".

Para remover: `Desinstalar-Assinador-MCI.bat`. Em caso de problema, veja `%LOCALAPPDATA%\AssinadorMCIssinador.log`.
Uso manual (sem instalar): `Assinador-MCI.bat` e deixe a janela aberta.

Requisito: driver do token instalado (o mesmo que você usa para assinar no Windows) e o pendrive conectado na hora de assinar.

## Detalhes
- Porta `47890`. Só aceita pedidos do app (`estoquemci.vercel.app` e `localhost`); veja `$OrigensPermitidas` no `assinador.ps1`.
- Assinatura CMS destacada (SHA-256) com `signing-certificate-v2` — PDF no formato `adbe.pkcs7.detached` (PAdES).
- Lista os certificados do repositório pessoal do Windows; o do token é marcado e escolhido por padrão.
- Teste sem token: `.\assinador.ps1 -PfxTeste arquivo.pfx -SenhaTeste senha`.
- Banco: rode `supabase/add_contratos_assinatura.sql` uma vez para guardar o PDF assinado no contrato.
