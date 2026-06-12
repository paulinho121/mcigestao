import { supabase } from '../lib/supabase';

export interface ItemContratoSalvo {
    equipamento: string;
    fabricante: string;
    qtd: number;
    valorUni: number;
    percDiaria: number;
    valorVenal: number;
    valorTotal: number;
    image_url?: string;
}

export interface ContratoLocacao {
    id: string;
    numero: string;
    data: string;
    vendedor: string;
    filial: string;
    // Locadora
    locadora_nome: string;
    locadora_cnpj: string;
    locadora_endereco: string;
    locadora_bairro: string;
    locadora_cidade: string;
    locadora_uf: string;
    locadora_cep: string;
    locadora_telefone: string;
    locadora_email: string;
    // Locatária
    locataria_nome: string;
    locataria_cnpj: string;
    locataria_endereco: string;
    locataria_bairro: string;
    locataria_cidade: string;
    locataria_uf: string;
    locataria_cep: string;
    locataria_telefone: string;
    locataria_pessoa_contato: string;
    locataria_email: string;
    locataria_insc_estadual: string;
    locataria_comp: string;
    // Período e valores
    data_inicio: string;
    data_fim: string;
    dias: number;
    valor_venal: number;
    forma_pagamento: string;
    frete: string;
    valor_frete: number;
    desconto: number;
    transportadora: string;
    valor_total: number;
    total_diaria: number;
    // Retirada
    responsavel_retirada: string;
    cpf_responsavel: string;
    data_retirada: string;
    observacoes: string;
    // Itens
    itens: ItemContratoSalvo[];
    created_at: string;
}

const STORAGE_KEY = 'mci_contratos_locacao';

function loadLocal(): ContratoLocacao[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list: ContratoLocacao[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Gera número no formato YYYYMMNN — ex: 20260601 */
export async function gerarNumeroContrato(): Promise<string> {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const prefixo = `${ano}${mes}`;

    // busca contratos do mês corrente para determinar próximo sequencial
    let seq = 1;

    if (supabase) {
        const { data } = await supabase
            .from('contratos_locacao')
            .select('numero')
            .like('numero', `${prefixo}%`)
            .order('numero', { ascending: false })
            .limit(1);
        if (data && data.length > 0) {
            const last = parseInt(data[0].numero.slice(6), 10);
            if (!isNaN(last)) seq = last + 1;
        }
    } else {
        const local = loadLocal().filter(c => c.numero.startsWith(prefixo));
        if (local.length > 0) {
            const maxSeq = Math.max(...local.map(c => parseInt(c.numero.slice(6), 10) || 0));
            seq = maxSeq + 1;
        }
    }

    return `${prefixo}${String(seq).padStart(2, '0')}`;
}

export const contratoLocacaoService = {
    async salvar(contrato: Omit<ContratoLocacao, 'id' | 'created_at'>): Promise<{ success: boolean; id?: string }> {
        const id = crypto.randomUUID();
        const created_at = new Date().toISOString();
        const registro: ContratoLocacao = { ...contrato, id, created_at };

        if (supabase) {
            const { itens, ...campos } = registro;
            const { error } = await supabase
                .from('contratos_locacao')
                .insert([{ ...campos, itens: JSON.stringify(itens) }]);
            if (!error) return { success: true, id };
        }

        const local = loadLocal();
        local.unshift(registro);
        saveLocal(local);
        return { success: true, id };
    },

    async listar(search = ''): Promise<ContratoLocacao[]> {
        if (supabase) {
            let q = supabase
                .from('contratos_locacao')
                .select('*')
                .order('created_at', { ascending: false });
            if (search) {
                q = q.or(`numero.ilike.%${search}%,locataria_nome.ilike.%${search}%,vendedor.ilike.%${search}%`);
            }
            const { data, error } = await q.limit(200);
            if (!error && data) {
                return data.map(r => ({ ...r, itens: typeof r.itens === 'string' ? JSON.parse(r.itens) : r.itens }));
            }
        }
        const local = loadLocal();
        if (!search) return local;
        const s = search.toLowerCase();
        return local.filter(c =>
            c.numero.includes(s) ||
            c.locataria_nome.toLowerCase().includes(s) ||
            c.vendedor.toLowerCase().includes(s)
        );
    },

    async buscarPorId(id: string): Promise<ContratoLocacao | null> {
        if (supabase) {
            const { data } = await supabase.from('contratos_locacao').select('*').eq('id', id).single();
            if (data) return { ...data, itens: typeof data.itens === 'string' ? JSON.parse(data.itens) : data.itens };
        }
        return loadLocal().find(c => c.id === id) ?? null;
    },

    async excluir(id: string): Promise<void> {
        if (supabase) await supabase.from('contratos_locacao').delete().eq('id', id);
        saveLocal(loadLocal().filter(c => c.id !== id));
    },
};
