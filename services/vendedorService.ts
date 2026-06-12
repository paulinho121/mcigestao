import { supabase } from '../lib/supabase';

export interface Vendedor {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    ativo: boolean;
    created_at: string;
}

const STORAGE_KEY = 'mci_vendedores_local';

function loadLocal(): Vendedor[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list: Vendedor[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const vendedorService = {
    async listar(): Promise<Vendedor[]> {
        if (supabase) {
            const { data, error } = await supabase
                .from('vendedores')
                .select('*')
                .order('nome');
            if (!error && data) return data as Vendedor[];
        }
        return loadLocal();
    },

    async salvar(v: Omit<Vendedor, 'id' | 'created_at'>): Promise<{ success: boolean }> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        if (supabase) {
            const { error } = await supabase.from('vendedores').insert([{ ...v, id, created_at: now }]);
            if (!error) return { success: true };
        }
        const local = loadLocal();
        local.unshift({ ...v, id, created_at: now });
        saveLocal(local);
        return { success: true };
    },

    async atualizar(id: string, v: Partial<Vendedor>): Promise<{ success: boolean }> {
        if (supabase) {
            const { error } = await supabase.from('vendedores').update(v).eq('id', id);
            if (!error) return { success: true };
        }
        const local = loadLocal();
        const idx = local.findIndex(x => x.id === id);
        if (idx !== -1) local[idx] = { ...local[idx], ...v };
        saveLocal(local);
        return { success: true };
    },

    async excluir(id: string): Promise<void> {
        if (supabase) {
            await supabase.from('vendedores').delete().eq('id', id);
        }
        saveLocal(loadLocal().filter(v => v.id !== id));
    },
};
