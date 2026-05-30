import { supabase } from '../lib/supabase';

export interface Cliente {
    id: string;
    cnpj_cpf: string;
    nome: string;
    categoria: string;
    uf: string;
    cidade: string;
    bairro: string;
    logradouro: string;
    numero: string;
    complemento: string;
    cep: string;
    telefone: string;
    email: string;
    created_at: string;
}

const STORAGE_KEY = 'mci_clientes_local';

function loadLocal(): Cliente[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list: Cliente[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Parseia uma linha do CSV semicolon-separated exportado do sistema
export function parseCSVLine(cols: string[]): Omit<Cliente, 'id' | 'created_at'> | null {
    if (cols.length < 25) return null;
    const cnpj = cols[0]?.trim();
    const nome = cols[1]?.trim();
    if (!cnpj || !nome) return null;

    return {
        cnpj_cpf:   cnpj,
        nome,
        categoria:  cols[2]?.trim() || '',
        uf:         cols[10]?.trim() || '',
        cep:        cols[12]?.trim() || '',
        cidade:     cols[13]?.trim() || '',
        bairro:     cols[14]?.trim() || '',
        logradouro: `${cols[16]?.trim() || ''} ${cols[17]?.trim() || ''}`.trim(),
        numero:     cols[17]?.trim() || '',
        complemento:cols[18]?.trim() || '',
        telefone:   cols[22]?.trim() || '',
        email:      cols[24]?.trim() || '',
    };
}

export const clienteService = {
    async listar(search = ''): Promise<Cliente[]> {
        if (supabase) {
            let q = supabase.from('clientes').select('*').order('nome');
            if (search) q = q.or(`nome.ilike.%${search}%,cnpj_cpf.ilike.%${search}%,email.ilike.%${search}%,cidade.ilike.%${search}%`);
            const { data, error } = await q;
            if (!error && data) return data as Cliente[];
        }
        const all = loadLocal();
        if (!search) return all;
        const s = search.toLowerCase();
        return all.filter(c =>
            c.nome.toLowerCase().includes(s) ||
            c.cnpj_cpf.includes(s) ||
            c.email.toLowerCase().includes(s) ||
            c.cidade.toLowerCase().includes(s)
        );
    },

    async salvar(cliente: Omit<Cliente, 'id' | 'created_at'>): Promise<{ success: boolean; message: string }> {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        if (supabase) {
            const { error } = await supabase.from('clientes').upsert(
                [{ ...cliente, id, created_at: now }],
                { onConflict: 'cnpj_cpf' }
            );
            if (!error) return { success: true, message: 'Cliente salvo.' };
        }

        const local = loadLocal();
        const idx = local.findIndex(c => c.cnpj_cpf === cliente.cnpj_cpf);
        if (idx !== -1) local[idx] = { ...local[idx], ...cliente };
        else local.unshift({ ...cliente, id, created_at: now });
        saveLocal(local);
        return { success: true, message: 'Cliente salvo localmente.' };
    },

    async importarCSV(raw: string): Promise<{ total: number; importados: number; duplicados: number; erros: number }> {
        const linhas = raw.split('\n').filter(l => l.trim());
        let importados = 0, duplicados = 0, erros = 0;
        const registros: Omit<Cliente, 'id' | 'created_at'>[] = [];

        for (const linha of linhas) {
            const cols = linha.split(';');
            const parsed = parseCSVLine(cols);
            if (parsed) registros.push(parsed);
            else erros++;
        }

        if (supabase && registros.length > 0) {
            const BATCH = 200;
            for (let i = 0; i < registros.length; i += BATCH) {
                const batch = registros.slice(i, i + BATCH).map(r => ({
                    ...r,
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                }));
                const { error } = await supabase.from('clientes').upsert(batch, { onConflict: 'cnpj_cpf' });
                if (!error) importados += batch.length;
                else erros += batch.length;
            }
        } else {
            const local = loadLocal();
            for (const r of registros) {
                const exists = local.findIndex(c => c.cnpj_cpf === r.cnpj_cpf);
                if (exists !== -1) { duplicados++; local[exists] = { ...local[exists], ...r }; }
                else local.unshift({ ...r, id: crypto.randomUUID(), created_at: new Date().toISOString() });
                importados++;
            }
            saveLocal(local);
        }

        return { total: linhas.length, importados, duplicados, erros };
    },

    async excluir(id: string): Promise<void> {
        if (supabase) {
            await supabase.from('clientes').delete().eq('id', id);
        } else {
            saveLocal(loadLocal().filter(c => c.id !== id));
        }
    },
};
