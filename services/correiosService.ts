// ─────────────────────────────────────────────────────────────────────────────
// Integração com a API dos Correios (CWS) — cliente
//
// As credenciais ficam EXCLUSIVAMENTE no servidor (Supabase Edge Function
// `correios-cotacao`). O navegador nunca vê a chave de API — respeitando o
// alerta dos Correios contra exposição client-side.
//
// Flag client-side (não-secreta) para ligar/desligar o recurso:
//   VITE_CORREIOS_ENABLED=true
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

const CORREIOS_ENABLED = import.meta.env.VITE_CORREIOS_ENABLED === 'true';

export interface CorreiosCotacaoRequest {
    cepOrigem: string;
    cepDestino: string;
    pesoKg: number;
    valorDeclarado: number;
    altura?: number;      // cm
    largura?: number;     // cm
    comprimento?: number; // cm
}

export interface CorreiosCotacaoResultado {
    coProduto: string;
    servico: string;              // nome amigável (SEDEX, PAC…)
    valorFrete: number;           // R$ (pcFinal)
    prazoEntrega: number;         // dias úteis
    dataPrevisaoEntrega?: string; // ISO
    entregaSabado?: boolean;
    entregaDomiciliar?: boolean;
    vlSeguro?: number;
    erro?: string;                // preenchido se este serviço específico falhou
}

export const correiosService = {
    /**
     * O recurso está habilitado no cliente? (a validação real das credenciais
     * acontece no servidor; aqui é só o flag de UI, não-secreto)
     */
    credenciaisConfiguradas(): boolean {
        return CORREIOS_ENABLED && !!supabase;
    },

    /**
     * Cota Preço + Prazo via Edge Function `correios-cotacao`.
     * Retorna um resultado por serviço (SEDEX, PAC…).
     */
    async cotar(params: CorreiosCotacaoRequest): Promise<CorreiosCotacaoResultado[]> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const { data, error } = await supabase.functions.invoke('correios-cotacao', {
            body: params,
        });

        if (error) {
            // Tenta extrair a mensagem detalhada do corpo da resposta da função
            let detalhe = error.message;
            try {
                const ctx = (error as any).context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    if (body?.error) detalhe = body.error;
                }
            } catch { /* mantém error.message */ }
            throw new Error(detalhe || 'Falha ao consultar Correios.');
        }

        if (data?.configured === false) {
            throw new Error('Correios não configurado no servidor.');
        }

        return (data?.resultados ?? []) as CorreiosCotacaoResultado[];
    },
};
