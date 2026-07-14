# Integração Correios — Cotação (Preço + Prazo)

Cotação SEDEX/PAC exibida ao lado da Jamef na tela **Cotação de Frete** (`#/frete`).

## Arquitetura (server-side)

A chave da API dos Correios fica **exclusivamente no servidor** — os Correios
alertam contra expor a chave no navegador, e a tela `#/frete` é pública/embutível.

```
Browser (CotacaoFrete.tsx)
  → correiosService.cotar()  [services/correiosService.ts]
  → supabase.functions.invoke('correios-cotacao')
  → Edge Function [supabase/functions/correios-cotacao/index.ts]
      → token  (POST /token/v1/autentica/cartaopostagem, Basic auth)
      → preço  (GET  /preco/v1/nacional/{coProduto})
      → prazo  (GET  /prazo/v1/nacional/{coProduto})
```

No cliente só existe o flag **não-secreto** `VITE_CORREIOS_ENABLED=true` (.env).

## Deploy

```bash
npx supabase login
npx supabase functions deploy correios-cotacao --project-ref vqnkopzeysrqzxavaxls
```

## Segredos (server-side, nunca no cliente)

```bash
npx supabase secrets set \
  CORREIOS_USUARIO=<login-do-CWS> \
  CORREIOS_CODIGO_ACESSO=<chave-completa-do-CWS> \
  CORREIOS_CARTAO_POSTAGEM=<numero-cartao-postagem> \
  CORREIOS_CONTRATO=<numero-contrato> \
  CORREIOS_DR=12 \
  CORREIOS_SERVICOS=03220:SEDEX,03298:PAC \
  --project-ref vqnkopzeysrqzxavaxls
```

O **código de acesso** deve vir da tela **"Gerar código de acesso as API's"** do
CWS (string curta alfanumérica de ~40 chars) — NÃO da tela de "chave" (formato
`cws-ch1_...`, que dá 401). A DR do contrato é **12** (Ceará).

## STATUS (14/07/2026) — AUTENTICAÇÃO OK, validado ao vivo

Token 201 com o código correto. Preço + Prazo testados via curl e retornando:
- SEDEX (03220): R$ 56,29 · 1 dia
- PAC (03298): R$ 27,39 · 5 dias
(origem 60160181 → destino 01310100, 1 kg, 20×15×10 cm)

Ajustes aplicados após o teste ao vivo:
- Prazo usa **`/prazo/v1/`** (não v3 — a doc estava errada).
- **vlDeclarado não é enviado** (exige serviço adicional "Valor Declarado",
  ERP-052); o pcFinal já inclui o seguro automático.

## DEPLOY — no ar (14/07/2026)

Função publicada no projeto `vqnkopzeysrqzxavaxls` via Dashboard (editor),
arquivo único `index.ts`, nome `correios-cotacao`. Os 6 secrets `CORREIOS_*`
definidos em Edge Functions → Secrets. Validado ponta a ponta: a tela `#/frete`
mostra SEDEX/PAC ao lado da Jamef.

**Pendente para PRODUÇÃO (Vercel):** adicionar a env var `VITE_CORREIOS_ENABLED=true`
nas configurações do projeto na Vercel e redeploy (sem isso, o card fica oculto
em produção; no dev local já está no `.env`).

Redeploy futuro: pode ser via Dashboard (colar `index.ts`) ou, com o CLI logado
na conta dona do projeto, `npx supabase functions deploy correios-cotacao
--project-ref vqnkopzeysrqzxavaxls`.

## Próximas fases (pedidas, ainda não feitas)

- **Rastro** (rastreamento) — junto ao rastreio Jamef na página de Tracking.
- **Pré-Postagem / Etiquetas** — criação de pré-postagem e emissão de rótulos.
