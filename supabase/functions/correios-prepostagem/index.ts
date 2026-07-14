/**
 * correios-prepostagem — Supabase Edge Function
 *
 * Pré-Postagem dos Correios (API CWS / PPN), credenciais só no servidor.
 * Ações (campo `action` no body):
 *   - "cep":    consulta endereço por CEP (auto-preenche o formulário)
 *   - "criar":  cria a pré-postagem (POST /prepostagem/v1/prepostagens)
 *   - "rotulo": gera o rótulo (etiqueta) PDF da pré-postagem criada
 *
 * Segredos (Supabase → Edge Functions → Secrets): CORREIOS_USUARIO,
 * CORREIOS_CODIGO_ACESSO, CORREIOS_CARTAO_POSTAGEM, CORREIOS_CONTRATO, CORREIOS_DR.
 *
 * Schema de criação validado ao vivo (campos obrigatórios):
 *   remetente/destinatario: nome, cpfCnpj, dddCelular, celular, email(rem),
 *     endereco{cep, logradouro, numero, bairro, cidade, uf}
 *   codigoServico, pesoInformado(g), codigoFormatoObjetoInformado(2=pacote),
 *   cienteObjetoNaoProibido:"1", alturaInformada, larguraInformada,
 *   comprimentoInformado (masculino!), itensDeclaracaoConteudo[{conteudo,quantidade,valor}]
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

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

// Extrai mensagens de erro dos vários formatos que a API retorna
async function erroCorreios(res: Response): Promise<string> {
    const txt = await res.text().catch(() => '');
    try {
        const j = JSON.parse(txt);
        if (Array.isArray(j.msgs)) return j.msgs.join(' | ');
        return j.msg || j.message || j.detail || txt.slice(0, 300);
    } catch { return txt.slice(0, 300); }
}

// ── Consulta CEP ──────────────────────────────────────────────────────────────
async function consultarCep(cep: string, token: string) {
    const res = await fetch(`${BASE}/cep/v2/enderecos/${soDigitos(cep)}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    if (!res.ok) return json({ erro: await erroCorreios(res) }, res.status === 400 ? 200 : 502);
    const d = await res.json();
    return json({
        cep: d.cep, logradouro: d.logradouro ?? '', bairro: d.bairro ?? '',
        cidade: d.localidade ?? d.cidade ?? '', uf: d.uf ?? '',
    });
}

// ── Criar pré-postagem ────────────────────────────────────────────────────────
async function criar(p: any, token: string) {
    const endereco = (e: any) => ({
        cep: soDigitos(e?.cep), logradouro: e?.logradouro ?? '', numero: String(e?.numero ?? 'S/N'),
        complemento: e?.complemento ?? '', bairro: e?.bairro ?? '', cidade: e?.cidade ?? '', uf: e?.uf ?? '',
    });
    const pessoa = (x: any, comEmail: boolean) => {
        const o: Record<string, unknown> = {
            nome: x?.nome ?? '', cpfCnpj: soDigitos(x?.cpfCnpj),
            dddCelular: soDigitos(x?.dddCelular) || soDigitos(x?.celular).slice(0, 2),
            celular: soDigitos(x?.celular).slice(-9), endereco: endereco(x?.endereco),
        };
        if (comEmail && x?.email) o.email = x.email;
        return o;
    };

    const body: Record<string, unknown> = {
        remetente: pessoa(p.remetente, true),
        destinatario: pessoa(p.destinatario, false),
        codigoServico: soDigitos(p.codigoServico),
        pesoInformado: String(Math.max(1, Math.round((Number(p.pesoKg) || 0) * 1000))),
        codigoFormatoObjetoInformado: String(p.formato ?? '2'),
        cienteObjetoNaoProibido: '1',
        alturaInformada: String(Math.max(1, Number(p.altura) || 2)),
        larguraInformada: String(Math.max(10, Number(p.largura) || 11)),
        comprimentoInformado: String(Math.max(15, Number(p.comprimento) || 16)),
        itensDeclaracaoConteudo: (p.itens ?? []).map((i: any) => ({
            conteudo: i.conteudo, quantidade: String(i.quantidade ?? '1'),
            valor: String(i.valor ?? '0').replace('.', ','),
        })),
    };
    if (p.numeroNotaFiscal) body.numeroNotaFiscal = String(p.numeroNotaFiscal);

    const res = await fetch(`${BASE}/prepostagem/v1/prepostagens`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) return json({ erro: await erroCorreios(res) }, 400);
    const d = await res.json();
    return json({
        id: d.id ?? d.idPrePostagem,
        codigoObjeto: d.codigoObjeto ?? d.codigoRastreamento,
        prePostagem: d,
    });
}

// ── Gerar rótulo (PDF assíncrono) ─────────────────────────────────────────────
async function rotulo(p: any, token: string) {
    const idsPrePostagem = p.idsPrePostagem ?? (p.id ? [p.id] : []);
    const codigosObjeto = p.codigosObjeto ?? (p.codigoObjeto ? [p.codigoObjeto] : []);

    // 1. Solicita geração assíncrona
    const solicita = await fetch(`${BASE}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            codigosObjeto, idsPrePostagem,
            tipoRotulo: 'P', formatoRotulo: 'ETIQUETA', imprimeRemetente: 'S', layoutImpressao: 'PADRAO',
        }),
    });
    if (!solicita.ok) return json({ erro: await erroCorreios(solicita) }, 400);
    const sol = await solicita.json();
    const idRecibo = sol.idRecibo ?? sol.id;

    // 2. Baixa (poll curto — costuma ficar pronto em segundos)
    for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const dl = await fetch(`${BASE}/prepostagem/v1/prepostagens/rotulo/download/assincrono/${idRecibo}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        if (dl.status === 200) {
            const d = await dl.json();
            if (d.dados || d.pdf) return json({ idRecibo, pdfBase64: d.dados ?? d.pdf });
        }
    }
    return json({ idRecibo, pendente: true, msg: 'Rótulo em geração — tente baixar novamente em instantes.' });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
    if (!Deno.env.get('CORREIOS_USUARIO') || !Deno.env.get('CORREIOS_CODIGO_ACESSO')) {
        return json({ configured: false }, 200);
    }

    let p: any;
    try { p = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

    let token: string;
    try { token = await getToken(); }
    catch (e) { return json({ error: (e as Error).message === 'CONFIG' ? 'Correios não configurado' : (e as Error).message }, 502); }

    try {
        switch (p.action) {
            case 'cep': return await consultarCep(p.cep, token);
            case 'criar': return await criar(p, token);
            case 'rotulo': return await rotulo(p, token);
            default: return json({ error: 'action inválida (use cep | criar | rotulo)' }, 400);
        }
    } catch (e) {
        return json({ error: (e as Error).message }, 500);
    }
});
