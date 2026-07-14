/**
 * correios-cotacao — Supabase Edge Function
 *
 * Cota Preço + Prazo dos Correios (API CWS) mantendo as credenciais
 * exclusivamente no servidor — a chave de API NUNCA vai para o navegador.
 *
 * Chamada pelo front via supabase.functions.invoke('correios-cotacao', { body }).
 *
 * Segredos necessários (Supabase → Edge Functions → Secrets):
 *   CORREIOS_USUARIO          → login do Meu Correios (ex.: mcistore)
 *   CORREIOS_CODIGO_ACESSO    → código de acesso à API gerado no CWS
 *   CORREIOS_CARTAO_POSTAGEM  → número do cartão de postagem
 *   CORREIOS_CONTRATO         → número do contrato
 *   CORREIOS_DR               → código da DR (opcional; ex.: 20)
 *   CORREIOS_SERVICOS         → "coProduto:Nome" separados por vírgula
 *                               (default: 03220:SEDEX,03298:PAC)
 */

const CORREIOS_BASE = 'https://api.correios.com.br';

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

interface Servico { coProduto: string; nome: string; }

function parseServicos(raw: string): Servico[] {
    return raw.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [co, nome] = s.split(':');
        return { coProduto: co.trim(), nome: (nome || co).trim() };
    });
}

function parseBRNumber(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string' || !v) return 0;
    const n = parseFloat(v.replace(/[R$\s.]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

function clampDim(v: number | undefined, min: number, fallback: number): number {
    return Math.max(Number(v) || fallback, min);
}

// Token em memória, reaproveitado entre invocações quentes
let _token: string | null = null;
let _tokenExp = 0;

async function getToken(): Promise<string> {
    if (_token && Date.now() < _tokenExp) return _token;

    const usuario = Deno.env.get('CORREIOS_USUARIO') ?? '';
    const codigo = Deno.env.get('CORREIOS_CODIGO_ACESSO') ?? '';
    const cartao = Deno.env.get('CORREIOS_CARTAO_POSTAGEM') ?? '';
    const contrato = Deno.env.get('CORREIOS_CONTRATO') ?? '';
    const dr = Deno.env.get('CORREIOS_DR') ?? '';

    if (!usuario || !codigo || !cartao) {
        throw new Error('CONFIG: credenciais dos Correios não configuradas no servidor.');
    }

    const basic = btoa(`${usuario}:${codigo}`);
    const body: Record<string, unknown> = { numero: cartao };
    if (contrato) body.contrato = contrato;
    if (dr) body.dr = Number(dr);

    const res = await fetch(`${CORREIOS_BASE}/token/v1/autentica/cartaopostagem`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        if (res.status === 429) throw new Error('Correios: limite de requisições de token (3/s) atingido.');
        throw new Error(`Correios: falha na autenticação (${res.status}). ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    if (!data.token) throw new Error('Correios: token não retornado na autenticação.');

    _token = data.token as string;
    _tokenExp = data.expiraEm ? new Date(data.expiraEm).getTime() - 5 * 60 * 1000 : Date.now() + 8 * 60 * 60 * 1000;
    return _token;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

    // Feature desligada se não há credenciais — devolve configured:false (não é erro)
    if (!Deno.env.get('CORREIOS_USUARIO') || !Deno.env.get('CORREIOS_CODIGO_ACESSO')) {
        return json({ configured: false, resultados: [] });
    }

    let params: any;
    try {
        params = await req.json();
    } catch {
        return json({ error: 'Corpo JSON inválido' }, 400);
    }

    const cepOrigem = String(params.cepOrigem ?? '').replace(/\D/g, '');
    const cepDestino = String(params.cepDestino ?? '').replace(/\D/g, '');
    if (!cepOrigem || !cepDestino) return json({ error: 'cepOrigem e cepDestino são obrigatórios' }, 400);

    const psObjeto = String(Math.max(1, Math.round((Number(params.pesoKg) || 0) * 1000))); // gramas
    const comprimento = clampDim(params.comprimento, 15, 20);
    const largura = clampDim(params.largura, 10, 15);
    const altura = clampDim(params.altura, 1, 10);
    // Obs.: vlDeclarado NÃO é enviado — exige o serviço adicional "Valor Declarado"
    // (ERP-052). O pcFinal já inclui o seguro automático (vlSeguroAutomatico).

    let token: string;
    try {
        token = await getToken();
    } catch (e) {
        const msg = (e as Error).message;
        if (msg.startsWith('CONFIG:')) return json({ configured: false, resultados: [] });
        return json({ error: msg }, 502);
    }

    const contrato = Deno.env.get('CORREIOS_CONTRATO') ?? '';
    const dr = Deno.env.get('CORREIOS_DR') ?? '';
    const servicos = parseServicos(Deno.env.get('CORREIOS_SERVICOS') ?? '03220:SEDEX,03298:PAC');
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

    const cotarUm = async (svc: Servico) => {
        try {
            const precoQs = new URLSearchParams({
                cepOrigem, cepDestino, psObjeto,
                tpObjeto: '2',
                comprimento: String(comprimento), largura: String(largura), altura: String(altura),
            });
            if (contrato) precoQs.set('nuContrato', contrato);
            if (dr) precoQs.set('nuDR', dr);

            const prazoQs = new URLSearchParams({ cepOrigem, cepDestino });

            const [precoRes, prazoRes] = await Promise.all([
                fetch(`${CORREIOS_BASE}/preco/v1/nacional/${svc.coProduto}?${precoQs}`, { headers: authHeaders }),
                fetch(`${CORREIOS_BASE}/prazo/v1/nacional/${svc.coProduto}?${prazoQs}`, { headers: authHeaders }),
            ]);

            if (!precoRes.ok) {
                const e = await precoRes.text().catch(() => '');
                return { coProduto: svc.coProduto, servico: svc.nome, valorFrete: 0, prazoEntrega: 0, erro: `Preço ${precoRes.status}: ${e.slice(0, 150)}` };
            }

            const preco = await precoRes.json();
            const prazo = prazoRes.ok ? await prazoRes.json() : {};

            let dataPrevisaoEntrega: string | undefined;
            if (prazo.dataMaxima) {
                const m = String(prazo.dataMaxima).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                dataPrevisaoEntrega = m
                    ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toISOString()
                    : new Date(prazo.dataMaxima).toISOString();
            }

            return {
                coProduto: svc.coProduto,
                servico: svc.nome,
                valorFrete: parseBRNumber(preco.pcFinal),
                prazoEntrega: Number(prazo.prazoEntrega) || 0,
                dataPrevisaoEntrega,
                entregaSabado: prazo.entregaSabado === 'S' || prazo.entregaSabado === true,
                entregaDomiciliar: prazo.entregaDomiciliar === 'S' || prazo.entregaDomiciliar === true,
                vlSeguro: parseBRNumber(preco.vlSeguroAutomatico),
            };
        } catch (e) {
            return { coProduto: svc.coProduto, servico: svc.nome, valorFrete: 0, prazoEntrega: 0, erro: (e as Error).message };
        }
    };

    const resultados = await Promise.all(servicos.map(cotarUm));
    return json({ configured: true, resultados });
});
