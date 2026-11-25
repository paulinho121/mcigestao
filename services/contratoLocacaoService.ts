import { supabase } from '../lib/supabase';
import type { ParcelaContrato } from '../pages/ContratoLocacaoForm';

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
    parcelas?: ParcelaContrato[];
    created_at: string;
    status?: 'pendente' | 'aprovado' | 'negado' | 'incorreto';
    // Assinatura digital (supabase/add_contratos_assinatura.sql)
    pdf_assinado_path?: string | null;
    assinado_em?: string | null;
    assinado_por?: string | null;
}

const STORAGE_KEY = 'mci_contratos_locacao';

function loadLocal(): ContratoLocacao[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list: ContratoLocacao[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Gera número no formato YYYYMMDD-N — ex: 20260613-1 */
export async function gerarNumeroContrato(): Promise<string> {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const dia = String(now.getDate()).padStart(2, '0');
    const prefixo = `${ano}${mes}${dia}`;

    let seq = 1;

    if (supabase) {
        const { data } = await supabase
            .from('contratos_locacao')
            .select('numero')
            .like('numero', `${prefixo}-%`)
            .order('numero', { ascending: false })
            .limit(1);
        if (data && data.length > 0) {
            const last = parseInt(data[0].numero.split('-')[1], 10);
            if (!isNaN(last)) seq = last + 1;
        }
    } else {
        const local = loadLocal().filter(c => c.numero.startsWith(`${prefixo}-`));
        if (local.length > 0) {
            const maxSeq = Math.max(...local.map(c => parseInt(c.numero.split('-')[1], 10) || 0));
            seq = maxSeq + 1;
        }
    }

    return `${prefixo}-${seq}`;
}

export const contratoLocacaoService = {
    async salvar(contrato: Omit<ContratoLocacao, 'id' | 'created_at'>): Promise<{ success: boolean; id?: string }> {
        const id = crypto.randomUUID();
        const created_at = new Date().toISOString();
        const registro: ContratoLocacao = { ...contrato, id, created_at };

        if (supabase) {
            const { itens, parcelas, ...campos } = registro;
            const { error } = await supabase
                .from('contratos_locacao')
                .insert([{ ...campos, itens: JSON.stringify(itens), parcelas: JSON.stringify(parcelas || []) }]);
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
                q = q.or(`numero.ilike.%${search}%,locataria_nome.ilike.%${search}%,locataria_cnpj.ilike.%${search}%,vendedor.ilike.%${search}%`);
            }
            const { data, error } = await q.limit(200);
            if (!error && data) {
                return data.map(r => ({
                    ...r,
                    itens: typeof r.itens === 'string' ? JSON.parse(r.itens) : r.itens,
                    parcelas: typeof r.parcelas === 'string' ? JSON.parse(r.parcelas) : (r.parcelas || []),
                }));
            }
        }
        const local = loadLocal();
        if (!search) return local;
        const s = search.toLowerCase();
        return local.filter(c =>
            c.numero.includes(s) ||
            c.locataria_nome.toLowerCase().includes(s) ||
            c.locataria_cnpj.toLowerCase().includes(s) ||
            c.vendedor.toLowerCase().includes(s)
        );
    },

    async buscarPorId(id: string): Promise<ContratoLocacao | null> {
        if (supabase) {
            const { data } = await supabase.from('contratos_locacao').select('*').eq('id', id).single();
            if (data) return {
                ...data,
                itens: typeof data.itens === 'string' ? JSON.parse(data.itens) : data.itens,
                parcelas: typeof data.parcelas === 'string' ? JSON.parse(data.parcelas) : (data.parcelas || []),
            };
        }
        return loadLocal().find(c => c.id === id) ?? null;
    },

    async excluir(id: string): Promise<void> {
        if (supabase) await supabase.from('contratos_locacao').delete().eq('id', id);
        saveLocal(loadLocal().filter(c => c.id !== id));
    },

    /**
     * Guarda o PDF assinado no Storage (bucket privado) e registra no contrato.
     * Cada assinatura vira um arquivo novo (nada é sobrescrito). Não lança erro: devolve o motivo.
     */
    async salvarPdfAssinado(id: string, numero: string, pdf: Uint8Array, assinadoPor: string): Promise<{ ok: boolean; motivo?: string }> {
        if (!supabase) return { ok: false, motivo: 'Supabase não configurado.' };
        const path = `${id}/${numero}-assinado-${Date.now()}.pdf`;
        const up = await supabase.storage.from('contratos-assinados').upload(path, pdf, { contentType: 'application/pdf', upsert: false });
        if (up.error) return { ok: false, motivo: `Não foi possível guardar o PDF (${up.error.message}). Rodou o SQL de assinatura?` };
        const { error } = await supabase.from('contratos_locacao')
            .update({ pdf_assinado_path: path, assinado_em: new Date().toISOString(), assinado_por: assinadoPor })
            .eq('id', id);
        if (error) return { ok: false, motivo: `PDF guardado, mas o contrato não foi atualizado (${error.message}).` };
        return { ok: true };
    },

    /** Link temporário (10 min) para baixar o PDF assinado. */
    async urlPdfAssinado(path: string): Promise<string | null> {
        if (!supabase) return null;
        const { data } = await supabase.storage.from('contratos-assinados').createSignedUrl(path, 600);
        return data?.signedUrl ?? null;
    },

    async atualizarStatus(id: string, status: 'pendente' | 'aprovado' | 'negado' | 'incorreto'): Promise<void> {
        if (supabase) await supabase.from('contratos_locacao').update({ status }).eq('id', id);
        const local = loadLocal();
        const idx = local.findIndex(c => c.id === id);
        if (idx !== -1) { local[idx].status = status; saveLocal(local); }
    },
};
