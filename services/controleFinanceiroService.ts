import { supabase } from '../lib/supabase';

export interface Parcela {
    id: string;
    nf_id: string;
    numero: number;
    valor: number;
    vencimento: string;
    data_pagamento?: string;
    juros?: number;
    multa?: number;
    observacao?: string;
}

export interface NotaFinanceira {
    id: string;
    ficha_id: string;
    tipo: string;
    numero_nf?: string;
    valor: number;
    observacao?: string;
    ordem: number;
}

export interface FichaFinanceira {
    id: string;
    cliente_nome: string;
    cliente_cnpj?: string;
    descricao?: string;
    created_at: string;
    notas: NotaFinanceira[];
    parcelas: Parcela[];
}

const STORAGE_KEY = 'mci_fichas_financeiras';

function loadLocal(): FichaFinanceira[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list: FichaFinanceira[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const controleFinanceiroService = {
    async listar(): Promise<FichaFinanceira[]> {
        if (supabase) {
            const { data: fichas, error } = await supabase
                .from('fichas_financeiras')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && fichas) {
                const { data: notas } = await supabase.from('notas_financeiras').select('*').order('ordem');
                const { data: parcelas } = await supabase.from('parcelas_financeiras').select('*').order('numero');
                return fichas.map(f => ({
                    ...f,
                    notas: (notas || []).filter(n => n.ficha_id === f.id),
                    parcelas: (parcelas || []).filter(p => p.nf_id && (notas || []).filter(n => n.ficha_id === f.id).map(n => n.id).includes(p.nf_id)),
                }));
            }
        }
        return loadLocal();
    },

    async buscarPorId(id: string): Promise<FichaFinanceira | null> {
        if (supabase) {
            const { data: f } = await supabase.from('fichas_financeiras').select('*').eq('id', id).single();
            if (f) {
                const { data: notas } = await supabase.from('notas_financeiras').select('*').eq('ficha_id', id).order('ordem');
                const nfIds = (notas || []).map(n => n.id);
                const { data: parcelas } = nfIds.length
                    ? await supabase.from('parcelas_financeiras').select('*').in('nf_id', nfIds).order('numero')
                    : { data: [] };
                return { ...f, notas: notas || [], parcelas: parcelas || [] };
            }
        }
        return loadLocal().find(f => f.id === id) ?? null;
    },

    async salvar(ficha: Omit<FichaFinanceira, 'id' | 'created_at'>): Promise<string> {
        const id = crypto.randomUUID();
        const created_at = new Date().toISOString();
        const registro: FichaFinanceira = { ...ficha, id, created_at };

        if (supabase) {
            const { error } = await supabase.from('fichas_financeiras').insert([{
                id, created_at, cliente_nome: ficha.cliente_nome,
                cliente_cnpj: ficha.cliente_cnpj, descricao: ficha.descricao,
            }]);
            if (!error) {
                for (const nota of ficha.notas) {
                    await supabase.from('notas_financeiras').insert([{ ...nota, ficha_id: id }]);
                }
                for (const parcela of ficha.parcelas) {
                    await supabase.from('parcelas_financeiras').insert([parcela]);
                }
                return id;
            }
        }

        const local = loadLocal();
        local.unshift(registro);
        saveLocal(local);
        return id;
    },

    async atualizar(ficha: FichaFinanceira): Promise<void> {
        if (supabase) {
            await supabase.from('fichas_financeiras').update({
                cliente_nome: ficha.cliente_nome,
                cliente_cnpj: ficha.cliente_cnpj,
                descricao: ficha.descricao,
            }).eq('id', ficha.id);

            const { data: notasExistentes } = await supabase.from('notas_financeiras').select('id').eq('ficha_id', ficha.id);
            const idsExistentes = (notasExistentes || []).map(n => n.id);

            for (const nota of ficha.notas) {
                if (idsExistentes.includes(nota.id)) {
                    await supabase.from('notas_financeiras').update(nota).eq('id', nota.id);
                } else {
                    await supabase.from('notas_financeiras').insert([{ ...nota, ficha_id: ficha.id }]);
                }
            }
            const idsAtuais = ficha.notas.map(n => n.id);
            const idsRemover = idsExistentes.filter(id => !idsAtuais.includes(id));
            if (idsRemover.length) {
                await supabase.from('parcelas_financeiras').delete().in('nf_id', idsRemover);
                await supabase.from('notas_financeiras').delete().in('id', idsRemover);
            }

            const allNfIds = ficha.notas.map(n => n.id);
            if (allNfIds.length) {
                const { data: parcelasExistentes } = await supabase.from('parcelas_financeiras').select('id').in('nf_id', allNfIds);
                const parcelasIdsExistentes = (parcelasExistentes || []).map(p => p.id);
                for (const p of ficha.parcelas) {
                    if (parcelasIdsExistentes.includes(p.id)) {
                        await supabase.from('parcelas_financeiras').update(p).eq('id', p.id);
                    } else {
                        await supabase.from('parcelas_financeiras').insert([p]);
                    }
                }
                const parcelasIdsAtuais = ficha.parcelas.map(p => p.id);
                const parcelasRemover = parcelasIdsExistentes.filter(id => !parcelasIdsAtuais.includes(id));
                if (parcelasRemover.length) {
                    await supabase.from('parcelas_financeiras').delete().in('id', parcelasRemover);
                }
            }
            return;
        }

        const local = loadLocal();
        const idx = local.findIndex(f => f.id === ficha.id);
        if (idx !== -1) { local[idx] = ficha; saveLocal(local); }
    },

    async excluir(id: string): Promise<void> {
        if (supabase) {
            const { data: notas } = await supabase.from('notas_financeiras').select('id').eq('ficha_id', id);
            const nfIds = (notas || []).map(n => n.id);
            if (nfIds.length) await supabase.from('parcelas_financeiras').delete().in('nf_id', nfIds);
            await supabase.from('notas_financeiras').delete().eq('ficha_id', id);
            await supabase.from('fichas_financeiras').delete().eq('id', id);
            return;
        }
        saveLocal(loadLocal().filter(f => f.id !== id));
    },
};
