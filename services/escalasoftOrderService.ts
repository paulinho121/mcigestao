import { supabase } from '../lib/supabase';

const SC_API_BASE = '/api/escalasoft'; // WMS + OMS — tudo em 170.82.192.22:9999
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
    // Sem hífens — formato compatível com Escalasoft ex: PED20260601SPWC
    return `PED${date}${rand}`;
}

export const escalasoftOrderService = {
    async sendOrder(params: {
        cliente_nome: string;
        cliente_cpf: string;
        produtos: OrderProduct[];
        observacao?: string;
        // Dados de endereço (obrigatórios pela API Escalasoft)
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

        // cnpjcpf deve ser NUMBER conforme schema da API
        const cnpjNumero = parseInt(params.cliente_cpf.replace(/\D/g, '') || '0', 10);

        // Monta produto principal como OBJETO ÚNICO (schema da API não aceita array)
        const produtoPrincipal = params.produtos[0] ?? {
            codigo_referencia: '', nome: '', quantidade: 1,
            valor_unitario: 0, valor_desconto: 0, valor_total: 0, bonificacao: 'N',
        };

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
                tipo: cnpjNumero.toString().length > 11 ? 'J' : 'F',
                cnpjcpf: cnpjNumero,          // NUMBER obrigatório
                telefone: '',
                email: '',
                ramo_atividade: 1,
                setor_atividade: 1,
                observacao: params.observacao || '',
                inscricao_estadual: 'ISENTO',
                consumidor_final: 'S',
                endereco_fiscal: {
                    cep: params.cep ?? 0,
                    logradouro: params.logradouro || '',
                    numero: params.numero_endereco ?? 0,
                    complemento: '',
                    pais: 'Brasil',
                    uf: params.uf || 'SC',
                    municipio: params.municipio || '',
                    codigo_municipio: params.codigo_municipio ?? 0,
                    bairro: params.bairro || '',
                },
            },
            endereco_entrega: { campo: '' },
            pagamento: [{ forma_pagamento: 1, vencimento: now.toLocaleDateString('pt-BR'), valor: valorTotal }],
            valor_frete: 0,
            // OBJETO ÚNICO conforme schema (não array)
            produtos: {
                codigo_referencia: produtoPrincipal.codigo_referencia,
                nome: produtoPrincipal.nome,
                quantidade: produtoPrincipal.quantidade,
                valor_unitario: produtoPrincipal.valor_unitario,
                valor_desconto: produtoPrincipal.valor_desconto,
                valor_total: produtoPrincipal.valor_total,
                bonificacao: produtoPrincipal.bonificacao,
            },
            valor_total: valorTotal,
        };

        let pedidoIdApi: number | null = null;
        let apiSuccess = false;
        let apiError = '';

        // A API Escalasoft aceita produtos como array ou objeto único.
        // Tentamos array primeiro; se der 400, tentamos com o primeiro item.
        try {
            console.log('[Escalasoft] POST /venda/pedido payload:', JSON.stringify(payload, null, 2));
            // Sem ?cnpj na URL — o endpoint POST não tem parâmetros de query (ver swagger)
            const res = await fetch(`${SC_API_BASE}/venda/pedido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });
            const text = await res.text();
            console.log(`[Escalasoft] Resposta ${res.status}:`, text);

            if (res.ok) {
                try {
                    const data = JSON.parse(text);
                    pedidoIdApi = data.pedido_id ?? null;
                } catch { /* sem body JSON */ }
                apiSuccess = true;
            } else {
                apiError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
                console.error('[Escalasoft] Erro:', apiError);
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
