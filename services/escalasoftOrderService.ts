import { supabase } from '../lib/supabase';

// ─── Configuração ─────────────────────────────────────────────────────────────
// WMS local do CD — proxy Vite: /api/escalasoft → http://170.82.192.22:9999/escalasoft
const WMS_BASE = '/api/escalasoft';

// CNPJ da filial (Sanco CD)
const CNPJ_CD = '05502390000200';

// ─── Status ───────────────────────────────────────────────────────────────────

// Status internos (nosso sistema)
export type OrderStatus =
    | 'enviado'
    | 'confirmado'
    | 'em_separacao'
    | 'em_transito'
    | 'entregue'
    | 'cancelado';

// Status reais retornados pelo WMS Escalasoft (painel Sanco)
export type WmsStatus =
    | 'Encerrada'
    | 'Em execução'
    | 'Ag gerar embarque'
    | 'Ag embarque'
    | 'Ag gerar devolução';

/** Converte status WMS → status interno */
export function mapWmsStatus(wmsStatus: string): OrderStatus {
    const s = (wmsStatus || '').toLowerCase();
    if (s.includes('encerrada'))         return 'entregue';
    if (s.includes('em execu'))          return 'em_separacao';
    if (s.includes('ag gerar embarque')) return 'em_separacao';
    if (s.includes('ag embarque'))       return 'em_transito';
    if (s.includes('devolu'))            return 'cancelado';
    return 'enviado';
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface OrderProduct {
    codigo_referencia: string;
    nome: string;
    quantidade: number;
    valor_unitario: number;
    valor_desconto: number;
    valor_total: number;
    bonificacao: 'S' | 'N';
}

export interface CDOrder {
    id: string;
    numero_pedido: string;
    pedido_id_api: number | null;       // NumeroOrdem retornado pelo WMS
    status: OrderStatus;
    status_wms: string | null;          // Status textual do WMS ex: "Em execução"
    created_at: string;
    updated_at: string;
    cliente_nome: string;
    cliente_cpf: string;
    produtos: OrderProduct[];
    valor_total: number;
    observacao: string;
    vendedor_email: string | null;      // E-mail do vendedor que criou o pedido
    vendedor_nome: string | null;       // Nome do vendedor
    // Campos do painel de acompanhamento Sanco
    transportadora: string | null;
    carregamento: string | null;        // Data de carregamento dd/mm/yyyy
    volume: number | null;              // Qtd de volumes
    nota_fiscal: string | null;         // Número da NF
    valor_nota_fiscal: number | null;   // Valor total da NF emitida
    numeros_serie: string | null;       // Números de série separados por vírgula
}

export interface PedidoPendenteCD {
    id: string;
    numero_pedido: string;
    cliente_nome: string;
    valor_total: number;
    created_at: string;
    status: OrderStatus;
    status_wms: string | null;
    numeroOrdemApi: number | null;
    produtos: OrderProduct[];
    transportadora: string | null;
    carregamento: string | null;
    volume: number | null;
    nota_fiscal: string | null;
    numeros_serie: string | null;
}

// ─── Headers WMS local (sem autenticação) ────────────────────────────────────

function wmsHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}

// ─── Helpers locais ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'cd_orders_local';

function loadLocalOrders(): CDOrder[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
}

function saveLocalOrders(orders: CDOrder[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function generateNumeroPedido(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PED${date}${rand}`;
}


// ─── Service ──────────────────────────────────────────────────────────────────

export const escalasoftOrderService = {

    // ── 1. Enviar pedido ao CD via WMS local ─────────────────────────────────
    async sendOrder(params: {
        cliente_nome: string;
        cliente_cpf: string;
        produtos: OrderProduct[];
        observacao?: string;
        cep?: number;
        uf?: string;
        municipio?: string;
        bairro?: string;
        logradouro?: string;
        numero_endereco?: number;
        codigo_municipio?: number;
        vendedor_email?: string;
        vendedor_nome?: string;
    }): Promise<{ success: boolean; pedido_id?: number; numero_pedido?: string; message?: string }> {

        const numeroPedido = generateNumeroPedido();
        const now = new Date();
        const valorTotal = params.produtos.reduce((sum, p) => sum + p.valor_total, 0);
        let apiSuccess = false;
        let apiError = '';
        let wmsResponseId: number | null = null;

        // ── Payload conforme exemplo real do WMS local ────────────────────────
        const observacao = [
            params.observacao || '',
            params.vendedor_nome ? `Vendedor: ${params.vendedor_nome}` : '',
            params.vendedor_email ? `Email: ${params.vendedor_email}` : '',
        ].filter(Boolean).join(' | ');

        const payload = {
            Lista: {
                Anexo: {
                    Tipo: 11,
                    Nome: numeroPedido,
                    NumeroPedido: numeroPedido,
                    Observacao: observacao,
                    Saida: {
                        Transportadora: CNPJ_CD,
                        NomeClienteFinal: params.cliente_nome,
                        UF: params.uf || '',
                        Municipio: params.municipio || '',
                        LocalEntrega: {
                            Cep: params.cep ? String(params.cep).padStart(8, '0') : '',
                            Estado: params.uf || '',
                            Municipio: params.codigo_municipio || 0,
                            Bairro: params.bairro || '',
                            Logradouro: params.logradouro || '',
                            Numero: String(params.numero_endereco || ''),
                        },
                        Programacao: params.produtos.map((p, i) => ({
                            Produto: p.codigo_referencia,
                            UnidadeMedida: 'PC',
                            Quantidade: p.quantidade,
                            SequencialPedido: i + 1,
                        })),
                    },
                },
            },
        };

        try {
            const url = `${WMS_BASE}/armazem/ordem/anexo/cadastrar?numeroOrdem=${encodeURIComponent(numeroPedido)}`;
            console.log('[WMS-CD] POST', url, JSON.stringify(payload, null, 2));

            const res = await fetch(url, {
                method: 'POST',
                headers: wmsHeaders(),
                body: JSON.stringify(payload),
            });

            const text = await res.text();
            console.log(`[WMS-CD] Resposta ${res.status}:`, text);

            if (res.ok) {
                apiSuccess = true;
                try {
                    const data = JSON.parse(text);
                    // Resposta: { Lista: [{ Registro, NumeroOrdem, NumeroPedido, Erro? }] }
                    const item = data.Lista?.[0];
                    wmsResponseId = item?.NumeroOrdem ?? item?.Registro ?? null;
                    if (item?.Erro) {
                        apiSuccess = false;
                        apiError = item.Erro;
                        console.warn('[WMS-CD] Erro WMS no body:', item.Erro);
                    }
                } catch { /* body não-JSON — ok */ }
            } else {
                apiError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
                console.warn('[WMS-CD] Falha ao enviar pedido:', apiError);
            }
        } catch (e: any) {
            apiError = e?.message || 'Erro de conexão com o WMS';
            console.warn('[WMS-CD] Exceção:', apiError);
        }

        // ── Salva pedido no Supabase / localStorage ──────────────────────────
        const newOrder: CDOrder = {
            id: crypto.randomUUID(),
            numero_pedido: numeroPedido,
            pedido_id_api: wmsResponseId,
            status: 'enviado',
            status_wms: apiSuccess ? 'Enviado' : null,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            cliente_nome: params.cliente_nome,
            cliente_cpf: params.cliente_cpf,
            produtos: params.produtos,
            valor_total: valorTotal,
            observacao: params.observacao || '',
            vendedor_email: params.vendedor_email || null,
            vendedor_nome: params.vendedor_nome || null,
            transportadora: null,
            carregamento: null,
            volume: null,
            nota_fiscal: null,
            valor_nota_fiscal: null,
            numeros_serie: null,
        };

        if (supabase) {
            const { error } = await supabase.from('cd_orders').insert([newOrder]);
            if (error) {
                const local = loadLocalOrders();
                local.unshift(newOrder);
                saveLocalOrders(local);
            }
        } else {
            const local = loadLocalOrders();
            local.unshift(newOrder);
            saveLocalOrders(local);
        }

        return {
            success: true,
            pedido_id: wmsResponseId ?? undefined,
            numero_pedido: numeroPedido,
            message: apiSuccess
                ? 'Pedido enviado ao CD com sucesso!'
                : `Pedido salvo localmente (WMS indisponível: ${apiError || 'sem resposta'}).`,
        };
    },

    // ── 2. Consultar ordem no WMS local ──────────────────────────────────────
    async consultarOrdem(numeroPedido: string): Promise<{
        situacao?: string;
        numeroOrdem?: number;
        transportadora?: string;
        carregamento?: string;
        volume?: number;
        nota_fiscal?: string;
        valor_nota_fiscal?: number;
        numeros_serie?: string;
    } | null> {
        try {
            const url = `${WMS_BASE}/armazem/ordem/consultar?numeroPedido=${encodeURIComponent(numeroPedido)}&cnpj=${CNPJ_CD}`;
            const res = await fetch(url, { headers: wmsHeaders() });
            if (!res.ok) return null;

            const data = await res.json();
            const ordem = data.Lista?.[0] ?? data;
            return {
                situacao:          ordem.Situacao          ?? ordem.situacao          ?? ordem.Status,
                numeroOrdem:       ordem.NumeroOrdem       ?? ordem.numeroOrdem,
                transportadora:    ordem.Transportadora    ?? ordem.transportadora,
                carregamento:      ordem.Carregamento      ?? ordem.carregamento      ?? ordem.DataCarregamento,
                volume:            ordem.Volume            ?? ordem.volume,
                nota_fiscal:       ordem.Nota              ?? ordem.nota              ?? ordem.NotaFiscal       ?? ordem.notaFiscal,
                valor_nota_fiscal: ordem.ValorNota         ?? ordem.valorNota         ?? ordem.ValorNotaFiscal  ?? ordem.Valor,
                numeros_serie:     ordem.NumeroSerie       ?? ordem.numeroSerie       ?? ordem['Numero de Série'],
            };
        } catch (e: any) {
            console.warn('[WMS-CD] Erro ao consultar ordem:', e?.message);
            return null;
        }
    },

    // ── 3. CRUD local / Supabase ──────────────────────────────────────────────

    async getOrders(): Promise<CDOrder[]> {
        if (supabase) {
            const { data, error } = await supabase
                .from('cd_orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) return data as CDOrder[];
        }
        return loadLocalOrders();
    },

    async updateStatus(id: string, status: OrderStatus, extra?: Partial<CDOrder>): Promise<void> {
        const now = new Date().toISOString();
        const patch = { status, updated_at: now, ...extra };

        if (supabase) {
            const { error } = await supabase.from('cd_orders').update(patch).eq('id', id);
            if (!error) return;
        }
        const local = loadLocalOrders();
        const idx = local.findIndex(o => o.id === id);
        if (idx !== -1) Object.assign(local[idx], patch);
        saveLocalOrders(local);
    },

    // ── 4. Sincroniza status de todos os pedidos ativos com o WMS ─────────────
    async syncAllStatuses(orders: CDOrder[]): Promise<Map<string, { status: OrderStatus; status_wms: string }>> {
        const updates = new Map<string, { status: OrderStatus; status_wms: string }>();
        const active = orders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado');

        await Promise.all(active.map(async (order) => {
            const wmsData = await this.consultarOrdem(order.numero_pedido);
            if (!wmsData?.situacao) return;

            const newStatus = mapWmsStatus(wmsData.situacao);
            const changed = newStatus !== order.status || wmsData.situacao !== order.status_wms;

            if (changed) {
                await this.updateStatus(order.id, newStatus, {
                    status_wms:        wmsData.situacao,
                    transportadora:    wmsData.transportadora    ?? order.transportadora,
                    carregamento:      wmsData.carregamento      ?? order.carregamento,
                    volume:            wmsData.volume            ?? order.volume,
                    nota_fiscal:       wmsData.nota_fiscal       ?? order.nota_fiscal,
                    valor_nota_fiscal: wmsData.valor_nota_fiscal ?? order.valor_nota_fiscal,
                    numeros_serie:     wmsData.numeros_serie     ?? order.numeros_serie,
                    pedido_id_api:     wmsData.numeroOrdem       ?? order.pedido_id_api,
                });
                updates.set(order.id, { status: newStatus, status_wms: wmsData.situacao });
            }
        }));

        return updates;
    },

    // ── 5. Pedidos pendentes enriquecidos com dados do WMS ────────────────────
    async getPedidosPendentesCD(): Promise<PedidoPendenteCD[]> {
        const allOrders = await this.getOrders();
        const pending = allOrders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado');

        const enriched = await Promise.all(pending.map(async (order) => {
            const wmsData = await this.consultarOrdem(order.numero_pedido);
            return {
                id:             order.id,
                numero_pedido:  order.numero_pedido,
                cliente_nome:   order.cliente_nome,
                valor_total:    order.valor_total,
                created_at:     order.created_at,
                status:         wmsData?.situacao ? mapWmsStatus(wmsData.situacao) : order.status,
                status_wms:     wmsData?.situacao     ?? order.status_wms,
                numeroOrdemApi: wmsData?.numeroOrdem  ?? order.pedido_id_api,
                produtos:       order.produtos,
                transportadora: wmsData?.transportadora ?? order.transportadora,
                carregamento:   wmsData?.carregamento   ?? order.carregamento,
                volume:         wmsData?.volume         ?? order.volume,
                nota_fiscal:    wmsData?.nota_fiscal    ?? order.nota_fiscal,
                numeros_serie:  wmsData?.numeros_serie  ?? order.numeros_serie,
            };
        }));

        return enriched;
    },

    // ── 6. Mapeamento legado (compatibilidade) ────────────────────────────────
    mapApiStatus(situacaoid: number): OrderStatus {
        switch (situacaoid) {
            case 1: return 'enviado';
            case 2: return 'confirmado';
            case 3: return 'em_separacao';
            case 4: return 'em_transito';
            case 5: return 'entregue';
            case 9: return 'cancelado';
            default: return 'enviado';
        }
    },

    async fetchApiStatus(_pedidoIdApi: number): Promise<{ situacaoid: number; situacao: string } | null> {
        return null; // Substituído por consultarOrdem + mapWmsStatus
    },
};
