/**
 * correios-rastro — Supabase Edge Function
 *
 * Rastreamento de objetos dos Correios (API Rastro), credenciais só no servidor.
 *
 * Chamada pelo front: supabase.functions.invoke('correios-rastro', { body: { codigos } })
 *
 * Segredos (Supabase → Edge Functions → Secrets): CORREIOS_USUARIO,
 * CORREIOS_CODIGO_ACESSO, CORREIOS_CARTAO_POSTAGEM, CORREIOS_CONTRATO, CORREIOS_DR.
 * (os mesmos já usados por correios-cotacao e correios-prepostagem)
 *
 * Endpoint real (validado ao vivo — a doc pública não bate com o path certo):
 *   GET /srorastro/v1/objetos/{codigo}                       — um único objeto
 *   GET /srorastro/v1/objetos?codigosObjetos=A&codigosObjetos=B  — vários (repete o param)
 */

const BASE = 'https://api.correios.com.br';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

let _token: string | null = null;
let _tokenExp = 0;

async function getToken(): Promise<string> {
    if (_token && Date.now() < _tokenExp) return _token;
    const usuario = Deno.env.get('CORREIOS_USUARIO') ?? '';
    const codigo = Deno.env.get('CORREIOS_CODIGO_ACESSO') ?? '';
    const cartao = Deno.env.get('CORREIOS_CARTAO_POSTAGEM') ?? '';
    const contrato = Deno.env.get('CORREIOS_CONTRATO') ?? '';
    const dr = Deno.env.get('CORREIOS_DR') ?? '';
    if (!usuario || !codigo || !cartao) throw new Error('CONFIG');

    const body: Record<string, unknown> = { numero: cartao };
    if (contrato) body.contrato = contrato;
    if (dr) body.dr = Number(dr);

    const res = await fetch(`${BASE}/token/v1/autentica/cartaopostagem`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(`${usuario}:${codigo}`)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Correios auth ${res.status}: ${(await res.text()).slice(0, 150)}`);
    const data = await res.json();
    _token = data.token as string;
    _tokenExp = data.expiraEm ? new Date(data.expiraEm).getTime() - 5 * 60 * 1000 : Date.now() + 8 * 3600 * 1000;
    return _token;
}

const ENTREGUE_RE = /entregue/i;

function normalizaObjeto(o: any) {
    const eventos = (o.eventos ?? []).map((e: any) => ({
        codigo: e.codigo,
        tipo: e.tipo,
        dataHora: e.dtHrCriado,
        descricao: e.descricao,
        detalhe: e.detalhe,
        cidade: e.unidade?.endereco?.cidade,
        uf: e.unidade?.endereco?.uf,
        cidadeDestino: e.unidadeDestino?.endereco?.cidade,
        ufDestino: e.unidadeDestino?.endereco?.uf,
    }));
    // API retorna do mais recente para o mais antigo
    const ultimo = eventos[0];
    return {
        codigoObjeto: o.codObjeto,
        categoria: o.tipoPostal?.categoria,
        descricaoServico: o.tipoPostal?.descricao,
        dataPrevisao: o.dtPrevista,
        entregue: !!ultimo && ENTREGUE_RE.test(ultimo.descricao ?? ''),
        situacaoAtual: ultimo?.descricao ?? 'Sem eventos',
        eventos,
    };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
    if (!Deno.env.get('CORREIOS_USUARIO') || !Deno.env.get('CORREIOS_CODIGO_ACESSO')) {
        return json({ configured: false, objetos: [] });
    }

    let p: any;
    try { p = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

    const codigos: string[] = (p.codigos ?? (p.codigo ? [p.codigo] : []))
        .map((c: string) => String(c).trim().toUpperCase())
        .filter(Boolean);
    if (codigos.length === 0) return json({ error: 'Informe ao menos um código de rastreio.' }, 400);

    let token: string;
    try { token = await getToken(); }
    catch (e) {
        const msg = (e as Error).message;
        return json({ error: msg === 'CONFIG' ? 'Correios não configurado' : msg }, 502);
    }

    try {
        // resultado=T força "Todos os Eventos" — sem isso, a consulta em lote
        // (múltiplos codigosObjetos) volta só o último evento por padrão.
        const qs = new URLSearchParams({ resultado: 'T' });
        codigos.forEach(c => qs.append('codigosObjetos', c));
        const url = codigos.length === 1
            ? `${BASE}/srorastro/v1/objetos/${codigos[0]}?resultado=T`
            : `${BASE}/srorastro/v1/objetos?${qs}`;

        // Accept-Language explícito: o runtime do Deno envia um header padrão que
        // a API dos Correios rejeita (SRO-018 — só aceita pt-BR, en ou es-ES exatos).
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Accept-Language': 'pt-BR' },
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            let msg = txt.slice(0, 300);
            try { const j = JSON.parse(txt); msg = (j.msgs || []).join(' | ') || j.msg || msg; } catch { /* mantém txt */ }
            return json({ error: msg }, 400);
        }
        const data = await res.json();
        const objetos = (data.objetos ?? []).map(normalizaObjeto);
        return json({ configured: true, objetos });
    } catch (e) {
        return json({ error: (e as Error).message }, 500);
    }
});
