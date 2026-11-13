/**
 * loja-integrada-nomes — Supabase Edge Function
 *
 * Lê (somente leitura) o catálogo da Loja Integrada e devolve SKU + nome de cada
 * produto, para o app alinhar `products.name` ao título exibido no site (mci.tv).
 * A chave da API fica exclusivamente nos secrets do Supabase:
 *
 *   LI_PERSONAL_TOKEN                       (token pessoal — Authorization: Basic <token>)
 *   — ou —
 *   LI_CHAVE_API + LI_CHAVE_APLICACAO       (Authorization: chave_api <KEY> aplicacao <APP>)
 *
 * Doc: https://api-docs.lojaintegrada.com.br  —  GET https://api.awsli.com.br/v1/produto
 * Limite da API: 100 requisições/min por loja (HTTP 429).
 *
 * Paginação: cada chamada lê até MAX_PAGINAS páginas a partir de `offset` e devolve
 * `proximoOffset` (null quando acabou); o front continua chamando até terminar.
 */

const LI_BASE = 'https://api.awsli.com.br';
const POR_PAGINA = 50;
const MAX_PAGINAS = 20; // 1000 produtos por chamada — cabe folgado no limite de tempo

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function authHeader(): string | null {
    const token = Deno.env.get('LI_PERSONAL_TOKEN');
    if (token) return `Basic ${token}`;
    const chave = Deno.env.get('LI_CHAVE_API');
    const app = Deno.env.get('LI_CHAVE_APLICACAO');
    if (chave && app) return `chave_api ${chave} aplicacao ${app}`;
    return null;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

    let body: { offset?: number } = {};
    try { body = await req.json(); } catch { /* corpo vazio = começa do zero */ }
    let offset = Math.max(0, Number(body.offset) || 0);

    const auth = authHeader();
    if (!auth) {
        return json({ configured: false, error: 'Loja Integrada não configurada (secrets ausentes).' });
    }

    const items: { sku: string; nome: string; ativo: boolean; url: string }[] = [];
    let total = 0;
    let proximoOffset: number | null = offset;

    try {
        for (let p = 0; p < MAX_PAGINAS && proximoOffset !== null; p++) {
            const url = `${LI_BASE}/v1/produto?limit=${POR_PAGINA}&offset=${offset}`;
            let res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });

            if (res.status === 429) { // limite de 100 req/min: espera e tenta uma vez
                await sleep(15000);
                res = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
            }
            if (res.status === 429) break; // devolve o que já leu; o front retoma de `proximoOffset`

            if (!res.ok) {
                const detalhe = res.status === 401 || res.status === 403
                    ? 'Credenciais da Loja Integrada recusadas — confira o token e se o plano inclui API.'
                    : `Loja Integrada respondeu ${res.status}.`;
                return json({ error: detalhe, status: res.status }, 502);
            }

            const data = await res.json();
            total = Number(data?.meta?.total_count) || total;
            for (const o of Array.isArray(data?.objects) ? data.objects : []) {
                if (o?.removido) continue;
                items.push({
                    sku: String(o?.sku ?? '').trim(),
                    nome: String(o?.nome ?? '').trim(),
                    ativo: !!o?.ativo,
                    url: String(o?.url ?? ''),
                });
            }

            offset += POR_PAGINA;
            proximoOffset = data?.meta?.next ? offset : null;
        }
    } catch (e: any) {
        return json({ error: `Falha ao consultar a Loja Integrada: ${e?.message ?? e}` }, 502);
    }

    return json({ configured: true, items, total, proximoOffset });
});
