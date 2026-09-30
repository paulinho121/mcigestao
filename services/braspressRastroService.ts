// ─────────────────────────────────────────────────────────────────────────────
// Rastreamento de encomendas na Braspress — cliente
//
// Conversa com a Edge Function `braspress-rastro` (credenciais no servidor,
// as mesmas da cotação: BRASPRESS_USER_<CNPJ> / BRASPRESS_PASS_<CNPJ>).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export interface BraspressNotaFiscal {
    serie?: string;
    numero?: string;
    emissao?: string;
}

export interface BraspressTimelineItem {
    descricao: string;
    data: string;
}

export interface BraspressOcorrencia {
    descricao: string;
    data: string;
}

export interface BraspressConhecimento {
    numero: string;               // número do conhecimento (AWB)
    origem?: string;
    emissao?: string;
    remetente?: string;
    destinatario?: string;
    tipoFrete?: string;
    volumes?: number;
    valorMercantil?: number;
    peso?: number;
    totalFrete?: number;
    previsaoEntrega?: string;
    dataEntrega?: string;
    status?: string;
    cidade?: string;
    uf?: string;
    cidadeColeta?: string;
    ufColeta?: string;
    dataOcorrencia?: string;
    ultimaOcorrencia?: string;
    notasFiscais?: BraspressNotaFiscal[];
    timeline?: BraspressTimelineItem[];
    ocorrencias?: BraspressOcorrencia[];
}

async function extrairErro(error: any): Promise<string> {
    let detalhe = error?.message as string | undefined;
    try {
        const ctx = error?.context;
        if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) detalhe = body.error;
        }
    } catch { /* mantém error.message */ }
    return detalhe || 'Falha ao rastrear na Braspress.';
}

export const braspressRastroService = {
    ativo(): boolean {
        return import.meta.env.VITE_BRASPRESS_ENABLED === 'true' && !!supabase;
    },

    /** Rastreia os conhecimentos de uma nota fiscal (CNPJ da filial = tomador do frete). */
    async rastrear(cnpj: string, notaFiscal: string): Promise<BraspressConhecimento[]> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const { data, error } = await supabase.functions.invoke('braspress-rastro', {
            body: { cnpj, notaFiscal },
        });

        if (error) throw new Error(await extrairErro(error));
        if (data?.configured === false) throw new Error(data.error || 'Braspress não configurada para esta filial.');
        if (data?.error && (!data.conhecimentos || data.conhecimentos.length === 0)) throw new Error(data.error);

        return (data?.conhecimentos ?? []) as BraspressConhecimento[];
    },
};
