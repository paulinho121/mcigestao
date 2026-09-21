// ─────────────────────────────────────────────────────────────────────────────
// Integração com a API da Braspress — cliente
//
// Usuário/senha ficam EXCLUSIVAMENTE no servidor (Supabase Edge Function
// `braspress-cotacao`, via secrets). O navegador nunca vê as credenciais.
//
// Flag client-side (não-secreta) para ligar/desligar o recurso:
//   VITE_BRASPRESS_ENABLED=true
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

const BRASPRESS_ENABLED = import.meta.env.VITE_BRASPRESS_ENABLED === 'true';

export interface BraspressVolume {
    quantidade: number;
    altura: number;      // cm
    largura: number;     // cm
    comprimento: number; // cm
}

export interface BraspressCotacaoRequest {
    cnpjRemetente: string;
    cnpjDestinatario: string;
    cepOrigem: string;
    cepDestino: string;
    peso: number;            // kg
    valorMercadoria: number; // R$
    volumes: number;
    volumesCubagem?: BraspressVolume[];
    modal?: 'R' | 'A';       // R = rodoviário, A = aéreo
}

export interface BraspressCotacaoResultado {
    id: number | string | null;
    servico: string;       // "Braspress Rodoviário" | "Braspress Aéreo"
    modal: 'R' | 'A';
    valorFrete: number;    // R$
    prazoEntrega: number;  // dias
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
    return detalhe || 'Falha ao consultar a Braspress.';
}

export const braspressService = {
    /** Recurso habilitado no cliente? (a validação real das credenciais é no servidor) */
    habilitado(): boolean {
        return BRASPRESS_ENABLED && !!supabase;
    },

    /** Cota UM modal (rodoviário ou aéreo) via Edge Function `braspress-cotacao`. */
    async cotar(params: BraspressCotacaoRequest): Promise<BraspressCotacaoResultado> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const { data, error } = await supabase.functions.invoke('braspress-cotacao', { body: params });

        if (error) throw new Error(await extrairErro(error));
        if (data?.configured === false) throw new Error(data.error || 'Braspress não configurada para esta filial.');
        if (!data?.resultado) throw new Error(data?.error || 'A Braspress não retornou cotação.');

        return data.resultado as BraspressCotacaoResultado;
    },
};
