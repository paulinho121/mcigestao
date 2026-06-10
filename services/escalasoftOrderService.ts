import { supabase } from '../lib/supabase';

// ─── Configuração ─────────────────────────────────────────────────────────────
// Credenciais fornecidas pela Escalasoft — configure no .env:
//   VITE_ESCALASOFT_USER=seu_usuario
//   VITE_ESCALASOFT_PASS=sua_senha
const OMS_USER = import.meta.env.VITE_ESCALASOFT_USER || '';
const OMS_PASS = import.meta.env.VITE_ESCALASOFT_PASS || '';

// Proxy Vite/Vercel → https://api.escalasoft.com.br
const OMS_BASE = '/api/escalasoft-oms';

// CNPJ da filial (Sanco CD)
const CNPJ_CD = '05502390000200';
const FILIAL_CNPJ = 5502390000200; // sem formatação, como integer

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

// ─── Token Bearer (cache 23h) ─────────────────────────────────────────────────

let _token: string | null = null;
let _tokenExp = 0;

async function getAuthToken(): Promise<string | null> {
    if (!OMS_USER || !OMS_PASS) {
        console.warn('[Escalasoft] Credenciais não configuradas. Defina VITE_ESCALASOFT_USER e VITE_ESCALASOFT_PASS no .env');
        return null;
    }
    if (_token && Date.now() < _tokenExp) return _token;

    try {
        const credentials = btoa(`${OMS_USER}:${OMS_PASS}`);
        const res = await fetch(`${OMS_BASE}/Authorization`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
            },
        });

        const text = await res.text();
        if (!res.ok) {
            console.error(`[Escalasoft] Auth falhou (${res.status}):`, text);
            return null;
        }

        // Token pode vir como JSON ou string pura
        try {
            const data = JSON.parse(text);
            _token = data.token || data.Token || data.access_token || data.AccessToken || text.trim();
        } catch {
            _token = text.trim();
        }

        _tokenExp = Date.now() + 23 * 60 * 60 * 1000; // 23h
        console.log('[Escalasoft] Token obtido com sucesso.');
        return _token;
    } catch (e: any) {
        console.error('[Escalasoft] Erro ao obter token:', e?.message);
        return null;
    }
}

function authHeaders(token: string): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
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

function formatDataBR(date: Date): string {
    const d = date.toLocaleDateString('pt-BR');
    const t = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const escalasoftOrderService = {

    // ── 1. Enviar pedido ao CD via API OMS ────────────────────────────────────
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
        const dataFormatada = formatDataBR(now);
        const valorTotal = params.produtos.reduce((sum, p) => sum + p.valor_total, 0);
        const clienteCnpj = parseInt(params.cliente_cpf.replace(/\D/g, '') || '0', 10);

        let pedidoIdApi: number | null = null;
        let apiSuccess = false;
        let apiError = '';

        const token = await getAuthToken();

        if (token) {
            // ── Payload conforme schema OrdemPost da API Escalasoft ──────────
            const payload = {
                Filial: FILIAL_CNPJ,
                Tipo: 0,                          // Ajustar conforme tabela do cliente Escalasoft
                Cliente: clienteCnpj,
                ClienteFaturamento: FILIAL_CNPJ,  // Faturamento pela própria filial
                Solicitacao: dataFormatada,
                Data: dataFormatada,
                Previsao: dataFormatada,
                NaturezaFiscal: 2,                // 2 = Venda
                NaturezaOperacao: 0,
                Deposito: 0,
                Observacao: params.observacao || '',
                NumeroPedido: numeroPedido,
                NumeroControle: numeroPedido,
                RealizaRetrabalho: 'N',
                CompoeRetrabalho: 'N',
                Saida: {
                    TipoTransporte: 1,            // 1 = Transportadora
                    Transportadora: 0,            // ID da transportadora na Escalasoft (0 = sem definir)
                    ClienteFinal: clienteCnpj,
                    NomeClienteFinal: params.cliente_nome,
                    Ordem: 0,
                },
            };

            try {
                const url = `${OMS_BASE}/armazem/ordem/cadastrar`;
                console.log('[Escalasoft] POST', url, JSON.stringify(payload, null, 2));

                const res = await fetch(url, {
                    method: 'POST',
                    headers: authHeaders(token),
                    body: JSON.stringify(payload),
                });

                const text = await res.text();
                console.log(`[Escalasoft] Resposta ${res.status}:`, text);

                if (res.ok) {
                    try {
                        const data = JSON.parse(text);
                        // Resposta: { Lista: [{ NumeroOrdem, NumeroPedido, Registro }] }
                        const registro = data.Lista?.[0];
                        pedidoIdApi = registro?.NumeroOrdem ?? registro?.Registro ?? null;
                    } catch { /* body não-JSON */ }

                    apiSuccess = true;

                    // ── Adiciona itens via endpoint de programação ───────────
                    if (pedidoIdApi) {
                        await this._adicionarItens(token, pedidoIdApi, params.produtos);
                    }
                } else {
                    apiError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
                    console.warn('[Escalasoft] Falha ao criar ordem:', apiError);
                }
            } catch (e: any) {
                apiError = e?.message || 'Erro de conexão com a API';
                console.warn('[Escalasoft] Exceção:', apiError);
            }
        } else {
            apiError = 'Credenciais não configuradas (VITE_ESCALASOFT_USER / VITE_ESCALASOFT_PASS)';
        }

        // ── Salva pedido no Supabase / localStorage ──────────────────────────
        const newOrder: CDOrder = {
            id: crypto.randomUUID(),
            numero_pedido: numeroPedido,
            pedido_id_api: pedidoIdApi,
            status: 'enviado',
            status_wms: null,
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
            pedido_id: pedidoIdApi ?? undefined,
            numero_pedido: numeroPedido,
            message: apiSuccess
                ? 'Pedido enviado ao CD com sucesso!'
                : `Pedido salvo localmente (API: ${apiError || 'indisponível'}).`,
        };
    },

    // ── Adiciona itens à ordem via /programacao/cadastrar ────────────────────
    async _adicionarItens(token: string, numeroOrdem: number, produtos: OrderProduct[]): Promise<void> {
        const url = `${OMS_BASE}/armazem/ordem/programacao/cadastrar?numeroOrdem=${numeroOrdem}`;

        for (let i = 0; i < produtos.length; i++) {
            const p = produtos[i];
            const itemPayload = {
                Produto: p.codigo_referencia,
                UnidadeMedida: 'UN',
                Quantidade: p.quantidade,
                SequencialPedido: i + 1,
                Observacao: p.nome,
            };
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: authHeaders(token),
                    body: JSON.stringify(itemPayload),
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.warn(`[Escalasoft] Item ${p.codigo_referencia} não adicionado (${res.status}):`, t);
                } else {
                    console.log(`[Escalasoft] Item ${p.codigo_referencia} adicionado à ordem ${numeroOrdem}`);
                }
            } catch (e: any) {
                console.warn(`[Escalasoft] Exceção ao adicionar item ${p.codigo_referencia}:`, e?.message);
            }
        }
    },

    // ── 2. Consultar ordem no WMS e retornar campos do painel ────────────────
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
        const token = await getAuthToken();
        if (!token) return null;

        try {
            const url = `${OMS_BASE}/armazem/ordem/consultar?numeroPedido=${encodeURIComponent(numeroPedido)}&cnpj=${CNPJ_CD}`;
            const res = await fetch(url, { headers: authHeaders(token) });
            if (!res.ok) return null;

            const data = await res.json();

            // Normaliza campos — a API pode retornar em diferentes formatos
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
            console.warn('[Escalasoft] Erro ao consultar ordem:', e?.message);
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
