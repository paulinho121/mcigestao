import { supabase } from '../lib/supabase';

const SC_API_BASE = '/api/escalasoft';           // WMS interno (170.82.192.22:9999)
const CNPJ_CD = '05502390000200';

export type OrderStatus = 'enviado' | 'confirmado' | 'em_separacao' | 'em_transito' | 'entregue' | 'cancelado';

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
    pedido_id_api: number | null;
    status: OrderStatus;
    created_at: string;
    cliente_nome: string;
    cliente_cpf: string;
    produtos: OrderProduct[];
    valor_total: number;
    observacao: string;
    updated_at: string;
}

export interface PedidoPendenteCD {
    id: string;
    numero_pedido: string;
    cliente_nome: string;
    valor_total: number;
    created_at: string;
    status: OrderStatus;
    situacaoApi?: string;        // Situacao retornada pelo WMS
    numeroOrdemApi?: number;     // NumeroOrdem retornado pelo WMS
    produtos: OrderProduct[];
}

const STORAGE_KEY = 'cd_orders_local';

function loadLocalOrders(): CDOrder[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveLocalOrders(orders: CDOrder[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function generateNumeroPedido(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    // Sem hífens — formato compatível com Escalasoft ex: PED20260601SPWC
    return `PED${date}${rand}`;
}

export const escalasoftOrderService = {
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
    }): Promise<{ success: boolean; pedido_id?: number; numero_pedido?: string; message?: string }> {
        const numeroPedido = generateNumeroPedido();
        const now = new Date();
        const dataFormatada = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const valorTotal = params.produtos.reduce((sum, p) => sum + p.valor_total, 0);

        // CNPJ da filial e do cliente como numbers
        const filialCnpj = parseInt(CNPJ_CD.replace(/\D/g, ''), 10);
        const clienteCnpj = parseInt(params.cliente_cpf.replace(/\D/g, '') || '0', 10);

        // Monta Programacao[] — cada produto vira um item de saída
        const programacao = params.produtos.map((p, i) => ({
            Produto: p.codigo_referencia,
            UnidadeMedida: 'UN',
            Quantidade: p.quantidade,
            SequencialPedido: i + 1,
            PercentualTolerancia: 0,
            Observacao: p.nome,
        }));

        // Payload conforme schema WMS - Ordem de Armazenagem (Saída)
        const payload = {
            Lista: {
                Ordem: [{
                    Filial: filialCnpj,
                    Tipo: 0,
                    Cliente: clienteCnpj,
                    NaturezaOperacao: 0,
                    Solicitante: 0,
                    Deposito: 0,
                    Projeto: '',
                    UnidadeNegocioCliente: 0,
                    Observacao: params.observacao || '',
                    Solicitacao: dataFormatada,
                    Previsao: dataFormatada,
                    Data: dataFormatada,
                    NumeroPedido: numeroPedido,
                    NumeroControle: numeroPedido,
                    RealizaRetrabalho: 'N',
                    CompoeRetrabalho: 'N',
                    NaturezaFiscal: 0,
                    Saida: {
                        TipoTransporte: 1,
                        Transportadora: '',
                        ClienteFinal: String(clienteCnpj),
                        NomeClienteFinal: params.cliente_nome,
                        UF: params.uf || 'SC',
                        Municipio: params.municipio || '',
                        OrdemEntrega: 0,
                        LocalEntrega: {
                            Cep: params.cep ? String(params.cep) : '',
                            Pais: 'Brasil',
                            Estado: params.uf || 'SC',
                            Municipio: params.codigo_municipio ?? 0,
                            Bairro: params.bairro || '',
                            Logradouro: params.logradouro || '',
                            TipoLogradouro: 'Rua',
                            Numero: params.numero_endereco ? String(params.numero_endereco) : '0',
                            Complemento: '',
                        },
                        Programacao: programacao,
                    },
                }],
            },
        };

        let pedidoIdApi: number | null = null;
        let apiSuccess = false;
        let apiError = '';

        // Tenta API pública primeiro, depois servidor interno
        // Apenas servidor interno WMS (onde o estoque funciona)
        const urls = [
            `${SC_API_BASE}/armazem/ordem/cadastrar?cnpj=${CNPJ_CD}`,
        ];

        for (const url of urls) {
            try {
                console.log(`[Escalasoft] POST ${url} payload:`, JSON.stringify(payload, null, 2));
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(payload),
                });
                const text = await res.text();
                console.log(`[Escalasoft] Resposta ${res.status} de ${url}:`, text);

                if (res.ok) {
                    try {
                        const data = JSON.parse(text);
                        const registro = data.Lista?.[0];
                        pedidoIdApi = registro?.NumeroOrdem ?? registro?.Registro ?? null;
                    } catch { /* sem body JSON */ }
                    apiSuccess = true;
                    break; // sucesso — não tenta próximo URL
                } else if (res.status === 401) {
                    apiError = 'Autenticação necessária (401). Verifique com o suporte Escalasoft.';
                    break; // 401 = não adianta tentar outro URL
                } else {
                    apiError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
                    console.warn(`[Escalasoft] ${url} falhou, tentando próximo...`);
                    // continua para tentar próximo URL
                }
            } catch (e: any) {
                apiError = e?.message || 'Conexão recusada';
                console.warn(`[Escalasoft] ${url} falha de conexão:`, apiError);
            }
        }

        const newOrder: CDOrder = {
            id: crypto.randomUUID(),
            numero_pedido: numeroPedido,
            pedido_id_api: pedidoIdApi,
            status: apiSuccess ? 'enviado' : 'enviado',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cliente_nome: params.cliente_nome,
            cliente_cpf: params.cliente_cpf,
            produtos: params.produtos,
            valor_total: valorTotal,
            observacao: params.observacao || '',
        };

        // Tenta salvar no Supabase, fallback localStorage
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

    async updateStatus(id: string, status: OrderStatus): Promise<void> {
        const now = new Date().toISOString();
        if (supabase) {
            const { error } = await supabase.from('cd_orders').update({ status, updated_at: now }).eq('id', id);
            if (!error) return;
        }
        const local = loadLocalOrders();
        const idx = local.findIndex(o => o.id === id);
        if (idx !== -1) { local[idx].status = status; local[idx].updated_at = now; }
        saveLocalOrders(local);
    },

    // Consulta o status real do pedido na API Escalasoft
    async fetchApiStatus(pedidoIdApi: number): Promise<{ situacaoid: number; situacao: string } | null> {
        try {
            const res = await fetch(`${SC_API_BASE}/venda/pedido/status?pedidoid=${pedidoIdApi}`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) return null;
            const data = await res.json();
            return { situacaoid: data.situacaoid, situacao: data.situacao };
        } catch {
            return null;
        }
    },

    // Consulta uma ordem pelo numeroPedido no WMS
    async consultarOrdem(numeroPedido: string): Promise<{ situacao?: string; numeroOrdem?: number } | null> {
        try {
            const res = await fetch(`${SC_API_BASE}/armazem/ordem/consultar?numeroPedido=${encodeURIComponent(numeroPedido)}&cnpj=${CNPJ_CD}`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) return null;
            const data = await res.json();
            return { situacao: data.Situacao, numeroOrdem: data.NumeroOrdem };
        } catch {
            return null;
        }
    },

    // Busca pedidos pendentes: carrega do Supabase e enriquece com status real da API WMS
    async getPedidosPendentesCD(): Promise<PedidoPendenteCD[]> {
        const allOrders = await this.getOrders();
        const pending = allOrders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado');

        const enriched = await Promise.all(pending.map(async (order) => {
            const apiData = await this.consultarOrdem(order.numero_pedido);
            return {
                id: order.id,
                numero_pedido: order.numero_pedido,
                cliente_nome: order.cliente_nome,
                valor_total: order.valor_total,
                created_at: order.created_at,
                status: order.status,
                produtos: order.produtos,
                situacaoApi: apiData?.situacao,
                numeroOrdemApi: apiData?.numeroOrdem,
            };
        }));

        return enriched;
    },

    // Mapeia o situacaoid da API para nosso OrderStatus interno
    mapApiStatus(situacaoid: number): OrderStatus {
        // Mapeamento baseado em padrões comuns de ERP Escalasoft
        // Ajuste os IDs conforme os valores reais retornados pela sua API
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

    // Sincroniza o status de todos os pedidos ativos com a API
    async syncAllStatuses(orders: CDOrder[]): Promise<Map<string, { status: OrderStatus; situacao: string }>> {
        const updates = new Map<string, { status: OrderStatus; situacao: string }>();
        const active = orders.filter(o =>
            o.pedido_id_api !== null &&
            o.status !== 'entregue' &&
            o.status !== 'cancelado'
        );

        await Promise.all(active.map(async (order) => {
            const apiResult = await this.fetchApiStatus(order.pedido_id_api!);
            if (!apiResult) return;
            const newStatus = this.mapApiStatus(apiResult.situacaoid);
            if (newStatus !== order.status) {
                await this.updateStatus(order.id, newStatus);
                updates.set(order.id, { status: newStatus, situacao: apiResult.situacao });
            }
        }));

        return updates;
    },
};
