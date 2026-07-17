// ─────────────────────────────────────────────────────────────────────────────
// Rastreamento de objetos dos Correios — cliente
//
// Conversa com a Edge Function `correios-rastro` (credenciais no servidor).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export interface CorreiosEvento {
    codigo: string;
    tipo: string;
    dataHora: string; // ISO
    descricao: string;
    detalhe?: string;
    cidade?: string;
    uf?: string;
    cidadeDestino?: string;
    ufDestino?: string;
}

export interface CorreiosObjetoRastreado {
    codigoObjeto: string;
    categoria?: string;         // SEDEX / ENCOMENDA PAC / ...
    descricaoServico?: string;
    dataPrevisao?: string;      // ISO
    entregue: boolean;
    situacaoAtual: string;
    eventos: CorreiosEvento[];
}

export const correiosRastroService = {
    ativo(): boolean {
        return import.meta.env.VITE_CORREIOS_ENABLED === 'true' && !!supabase;
    },

    /** Rastreia um ou mais códigos de objeto (ex.: AD687837723BR) */
    async rastrear(codigos: string | string[]): Promise<{ objetos: CorreiosObjetoRastreado[]; erro?: string }> {
        if (!supabase) throw new Error('Supabase não configurado.');
        const lista = Array.isArray(codigos) ? codigos : [codigos];

        const { data, error } = await supabase.functions.invoke('correios-rastro', {
            body: { codigos: lista },
        });

        if (error) {
            let detalhe = error.message;
            try {
                const ctx = (error as any).context;
                if (ctx && typeof ctx.json === 'function') {
                    const b = await ctx.json();
                    if (b?.error) detalhe = b.error;
                }
            } catch { /* mantém */ }
            throw new Error(detalhe || 'Falha ao rastrear objeto(s).');
        }

        if (data?.configured === false) throw new Error('Rastreamento Correios não configurado no servidor.');
        return { objetos: data?.objetos ?? [], erro: data?.erro };
    },
};
