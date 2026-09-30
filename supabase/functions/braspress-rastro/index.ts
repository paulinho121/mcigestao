/**
 * braspress-rastro — Supabase Edge Function
 *
 * Rastreamento de encomendas na API da Braspress, mantendo usuário/senha
 * exclusivamente no servidor — reaproveita os MESMOS secrets da cotação
 * (BRASPRESS_USER_<CNPJ> / BRASPRESS_PASS_<CNPJ>, um par por CNPJ de filial).
 *
 * Chamada pelo front via supabase.functions.invoke('braspress-rastro', { body }).
 *
 * Doc: https://api.braspress.com/home
 *   GET https://api.braspress.com/v3/tracking/byNf/{cnpj}/{notaFiscal}/json
 *   {cnpj} = CNPJ do TOMADOR do frete (normalmente a filial remetente),
 *   não o CNPJ do destinatário. Busca os últimos 90 dias.
 */

const BRASPRESS_BASE = 'https://api.braspress.com';

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

const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

interface Body {
    cnpj: string;       // CNPJ da filial (tomador do frete) — escolhe as credenciais
    notaFiscal: string;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

    let body: Body;
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Corpo da requisição inválido.' }, 400);
    }

    const cnpj = onlyDigits(body.cnpj);
    const notaFiscal = onlyDigits(body.notaFiscal);

    if (cnpj.length !== 14) return json({ error: 'CNPJ da filial inválido.' }, 400);
    if (!notaFiscal) return json({ error: 'Informe o número da nota fiscal.' }, 400);

    const user = Deno.env.get(`BRASPRESS_USER_${cnpj}`) ?? '';
    const pass = Deno.env.get(`BRASPRESS_PASS_${cnpj}`) ?? '';
    if (!user || !pass) {
        return json({ configured: false, error: `Braspress não configurada para o CNPJ ${cnpj}.` });
    }

    try {
        const url = `${BRASPRESS_BASE}/v3/tracking/byNf/${cnpj}/${notaFiscal}/json`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${btoa(`${user}:${pass}`)}`,
                'Accept': 'application/json',
            },
        });

        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch { /* resposta não-JSON */ }

        if (!res.ok) {
            const msg = data?.message
                || (Array.isArray(data?.errorList) ? data.errorList.map((e: any) => e?.message ?? e).join('; ') : '')
                || `Braspress respondeu ${res.status}.`;
            return json({ error: msg, status: res.status }, res.status === 404 ? 404 : 502);
        }

        const conhecimentos = Array.isArray(data?.conhecimentos) ? data.conhecimentos : [];
        if (conhecimentos.length === 0) {
            return json({ configured: true, conhecimentos: [], error: 'Nenhum conhecimento encontrado para esta nota fiscal nos últimos 90 dias.' });
        }

        return json({ configured: true, conhecimentos });
    } catch (e: any) {
        return json({ error: `Falha ao consultar a Braspress: ${e?.message ?? e}` }, 502);
    }
});
