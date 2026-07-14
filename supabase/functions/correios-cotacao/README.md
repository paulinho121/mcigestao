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
      → prazo  (GET  /prazo/v3/nacional/{coProduto})
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
  CORREIOS_SERVICOS=03220:SEDEX,03298:PAC \
  --project-ref vqnkopzeysrqzxavaxls
# CORREIOS_DR=<código> só se o token pedir
```

## STATUS (14/07/2026) — BLOQUEADO na autenticação

A credencial dos Correios retorna **401** em todos os endpoints de token
(`/autentica`, `/contrato`, `/cartaopostagem`), independente de DR/corpo.

- Login `mcistore` confirmado (gateway retorna `x-gtw-user: mcistore`).
- Codificação Basic e formato conferem com a doc oficial.
- Logo, o bloqueio é **do lado da conta/CWS**, não do código.

**Causa provável:** serviços de API não vinculados ao contrato.
Precisa estar ativo no CWS: Token/API, **38202 (API Preços)**, **38210 (API Prazos)**.

**Ação:** suporte Correios com o req-id de exemplo `dzkwB2NFRInCBSjT5G2pK`
(user `mcistore`, serviço `token`).

## Retomar quando a credencial autenticar

1. `secrets set` com a chave válida + `functions deploy`.
2. Testar: `supabase.functions.invoke('correios-cotacao', { body: { cepOrigem, cepDestino, pesoKg, valorDeclarado } })`
   deve retornar `{ configured: true, resultados: [...] }`.
3. Validar SEDEX/PAC aparecendo na tela ao lado da Jamef.

## Próximas fases (pedidas, ainda não feitas)

- **Rastro** (rastreamento) — junto ao rastreio Jamef na página de Tracking.
- **Pré-Postagem / Etiquetas** — criação de pré-postagem e emissão de rótulos.
