/**
 * wms-sync — Supabase Edge Function
 *
 * Sincroniza o status dos pedidos ativos com o WMS Escalasoft.
 * Roda a cada 5 minutos via pg_cron (ver SQL abaixo).
 *
 * Variáveis de ambiente necessárias no Supabase Dashboard:
 *   ESCALASOFT_USER     → usuário da API pública Escalasoft
 *   ESCALASOFT_PASS     → senha da API pública Escalasoft
 *   SUPABASE_URL        → URL do projeto Supabase (automático)
 *   SUPABASE_SERVICE_ROLE_KEY → chave service_role (automático)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OMS_BASE   = 'https://api.escalasoft.com.br';
const CNPJ_CD    = '05502390000200';

// Token em memória (reaproveitado entre invocações quentes)
let _token: string | null = null;
let _tokenExp = 0;

// ── Mapeamento status WMS → status interno ────────────────────────────────────
function mapWmsStatus(wmsStatus: string): string {
    const s = (wmsStatus || '').toLowerCase();
    if (s.includes('encerrada'))         return 'entregue';
    if (s.includes('em execu'))          return 'em_separacao';
    if (s.includes('ag gerar embarque')) return 'em_separacao';
    if (s.includes('ag embarque'))       return 'em_transito';
    if (s.includes('devolu'))            return 'cancelado';
    return 'enviado';
}

// ── Auth Escalasoft ───────────────────────────────────────────────────────────
async function getToken(user: string, pass: string): Promise<string | null> {
    if (_token && Date.now() < _tokenExp) return _token;

    const credentials = btoa(`${user}:${pass}`);
    const res = await fetch(`${OMS_BASE}/Authorization`, {
        headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' },
    });

    if (!res.ok) {
        console.error(`[wms-sync] Auth falhou: ${res.status}`);
        return null;
    }

    const text = await res.text();
    try {
        const data = JSON.parse(text);
        _token = data.token ?? data.Token ?? data.access_token ?? text.trim();
    } catch {
        _token = text.trim();
    }

    _tokenExp = Date.now() + 23 * 60 * 60 * 1000;
    return _token;
}

// ── Consulta ordem no WMS ─────────────────────────────────────────────────────
async function consultarOrdem(token: string, numeroPedido: string) {
    const url = `${OMS_BASE}/armazem/ordem/consultar?numeroPedido=${encodeURIComponent(numeroPedido)}&cnpj=${CNPJ_CD}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const ordem = data.Lista?.[0] ?? data;

    return {
        situacao:          ordem.Situacao          ?? ordem.Status,
        numeroOrdem:       ordem.NumeroOrdem,
        transportadora:    ordem.Transportadora,
        carregamento:      ordem.Carregamento      ?? ordem.DataCarregamento,
        volume:            ordem.Volume,
        nota_fiscal:       ordem.Nota              ?? ordem.NotaFiscal,
        valor_nota_fiscal: ordem.ValorNota         ?? ordem.ValorNotaFiscal ?? ordem.Valor,
        numeros_serie:     ordem.NumeroSerie       ?? ordem['Numero de Série'],
    };
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    // Aceita chamadas GET (pg_cron) e POST (manual/webhook)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const omsUser = Deno.env.get('ESCALASOFT_USER') ?? '';
    const omsPass = Deno.env.get('ESCALASOFT_PASS') ?? '';

    if (!omsUser || !omsPass) {
        return new Response(JSON.stringify({ error: 'Credenciais ESCALASOFT não configuradas' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Busca pedidos ativos (não encerrados nem cancelados)
    const { data: pedidos, error } = await supabase
        .from('cd_orders')
        .select('id, numero_pedido, status, status_wms, pedido_id_api, nota_fiscal, transportadora, carregamento, volume, valor_nota_fiscal, numeros_serie')
        .not('status', 'in', '("entregue","cancelado")')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!pedidos || pedidos.length === 0) {
        return new Response(JSON.stringify({ synced: 0, message: 'Nenhum pedido ativo' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const token = await getToken(omsUser, omsPass);
    if (!token) {
        return new Response(JSON.stringify({ error: 'Falha ao obter token Escalasoft' }), {
            status: 401, headers: { 'Content-Type': 'application/json' },
        });
    }

    let synced = 0;
    let errors = 0;

    // Processa em lotes de 5 para não sobrecarregar o WMS
    const BATCH = 5;
    for (let i = 0; i < pedidos.length; i += BATCH) {
        const batch = pedidos.slice(i, i + BATCH);
        await Promise.all(batch.map(async (pedido) => {
            try {
                const wms = await consultarOrdem(token, pedido.numero_pedido);
                if (!wms?.situacao) return;

                const novoStatus = mapWmsStatus(wms.situacao);
                const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
                let hasChange = false;

                if (novoStatus !== pedido.status)                             { patch.status = novoStatus;                   hasChange = true; }
                if (wms.situacao !== pedido.status_wms)                       { patch.status_wms = wms.situacao;             hasChange = true; }
                if (wms.numeroOrdem && wms.numeroOrdem !== pedido.pedido_id_api) { patch.pedido_id_api = wms.numeroOrdem;    hasChange = true; }
                if (wms.transportadora && wms.transportadora !== pedido.transportadora) { patch.transportadora = wms.transportadora; hasChange = true; }
                if (wms.carregamento && wms.carregamento !== pedido.carregamento)       { patch.carregamento = wms.carregamento;     hasChange = true; }
                if (wms.volume != null && wms.volume !== pedido.volume)       { patch.volume = wms.volume;                   hasChange = true; }
                if (wms.nota_fiscal && wms.nota_fiscal !== pedido.nota_fiscal){ patch.nota_fiscal = wms.nota_fiscal;         hasChange = true; }
                if (wms.valor_nota_fiscal != null && wms.valor_nota_fiscal !== pedido.valor_nota_fiscal) { patch.valor_nota_fiscal = wms.valor_nota_fiscal; hasChange = true; }
                if (wms.numeros_serie && wms.numeros_serie !== pedido.numeros_serie) { patch.numeros_serie = wms.numeros_serie; hasChange = true; }

                if (hasChange) {
                    await supabase.from('cd_orders').update(patch).eq('id', pedido.id);
                    synced++;
                    console.log(`[wms-sync] ${pedido.numero_pedido} → ${wms.situacao} ${wms.nota_fiscal ? `NF:${wms.nota_fiscal}` : ''}`);
                }
            } catch (e) {
                errors++;
                console.error(`[wms-sync] Erro em ${pedido.numero_pedido}:`, e);
            }
        }));
    }

    return new Response(JSON.stringify({
        ok: true,
        total: pedidos.length,
        synced,
        errors,
        timestamp: new Date().toISOString(),
    }), { headers: { 'Content-Type': 'application/json' } });
});
