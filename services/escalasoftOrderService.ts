import { supabase } from '../lib/supabase';

const SC_API_BASE = '/api/escalasoft';
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
    NumeroOrdem: number;
    NumeroPedido: number;
    Quantidade: number;
    QuantidadeVolume: number;
    PesoBruto: number;
    PesoLiquido: number;
    Valor: number;
    QuantidadeEmbalagem: number;
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
    return `PED-${date}-${rand}`;
}

export const escalasoftOrderService = {
    async sendOrder(params: {
        cliente_nome: string;
        cliente_cpf: string;
        produtos: OrderProduct[];
        observacao?: string;
    }): Promise<{ success: boolean; pedido_id?: number; numero_pedido?: string; message?: string }> {
        const numeroPedido = generateNumeroPedido();
        const now = new Date();
        const dataFormatada = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const valorTotal = params.produtos.reduce((sum, p) => sum + p.valor_total, 0);

        const payload = {
            tipo: 1,
            data: dataFormatada,
            numero_pedido: numeroPedido,
            numero_controle: numeroPedido,
            condicao_pagamento: 1,
            forma_pagamento: 1,
            conta_tesouraria: 1,
            cliente: {
                razao_social: params.cliente_nome,
                nome_fantasia: params.cliente_nome,
                tipo: 'F',
                cnpjcpf: params.cliente_cpf.replace(/\D/g, ''),
                telefone: '',
                email: '',
                ramo_atividade: 1,
                setor_atividade: 1,
                observacao: params.observacao || '',
                inscricao_estadual: 'ISENTO',
                consumidor_final: 'S',
                endereco_fiscal: {
                    cep: 0,
                    logradouro: '',
                    numero: 0,
                    complemento: '',
                    pais: 'Brasil',
                    uf: 'SC',
                    municipio: '',
                    codigo_municipio: 0,
                    bairro: '',
                },
            },
            endereco_entrega: { campo: '' },
            pagamento: [{ forma_pagamento: 1, vencimento: now.toLocaleDateString('pt-BR'), valor: valorTotal }],
            valor_frete: 0,
            produtos: params.produtos,
            valor_total: valorTotal,
        };

        let pedidoIdApi: number | null = null;
        let apiSuccess = false;
        let apiError = '';

        // A API Escalasoft aceita produtos como array ou objeto único.
        // Tentamos array primeiro; se der 400, tentamos com o primeiro item.
        const tryPost = async (produtosPayload: any) => {
            const body = { ...payload, produtos: produtosPayload };
            console.log('[Escalasoft] POST payload:', JSON.stringify(body, null, 2));
            const res = await fetch(`${SC_API_BASE}/venda/pedido?cnpj=${CNPJ_CD}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            console.log(`[Escalasoft] Resposta ${res.status}:`, text);
            return { ok: res.ok, status: res.status, text };
        };

        try {
            // Tentativa 1: produtos como array (padrão multi-item)
            let result = await tryPost(params.produtos);

            // Se 400, tenta como objeto único (schema da doc mostra objeto)
            if (!result.ok && result.status === 400 && params.produtos.length > 0) {
                console.log('[Escalasoft] Tentando produtos como objeto único...');
                result = await tryPost(params.produtos[0]);
            }

            if (result.ok) {
                try {
                    const data = JSON.parse(result.text);
                    pedidoIdApi = data.pedido_id ?? null;
                } catch { /* sem body JSON */ }
                apiSuccess = true;
            } else {
                apiError = `HTTP ${result.status}: ${result.text.slice(0, 200)}`;
                console.error('[Escalasoft] Erro na API:', apiError);
            }
        } catch (e: any) {
            apiError = e?.message || 'Conexão recusada';
            console.error('[Escalasoft] Falha na conexão:', apiError);
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

    // Busca pedidos pendentes no CD (aguardando documento fiscal / não recebidos)
    async getPedidosPendentesCD(): Promise<PedidoPendenteCD[]> {
        try {
            const res = await fetch(`${SC_API_BASE}/armazem/ordem/pedidoPendente?cnpj=${CNPJ_CD}`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data.Pedidos ?? [];
        } catch {
            return [];
        }
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
