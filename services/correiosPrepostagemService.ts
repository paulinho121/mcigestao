// ─────────────────────────────────────────────────────────────────────────────
// Pré-Postagem dos Correios — cliente
//
// Conversa com a Edge Function `correios-prepostagem` (credenciais no servidor).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export interface EnderecoPP {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
}

export interface PessoaPP {
    nome: string;
    cpfCnpj: string;
    dddCelular?: string;
    celular: string;
    email?: string;
    endereco: EnderecoPP;
}

export interface ItemDeclaracao {
    conteudo: string;
    quantidade: number | string;
    valor: number | string;
}

export interface CriarPrePostagemInput {
    remetente: PessoaPP;
    destinatario: PessoaPP;
    codigoServico: string;   // 03220 SEDEX, 03298 PAC
    pesoKg: number;
    formato?: string;        // "2" = pacote
    altura?: number;
    largura?: number;
    comprimento?: number;
    itens: ItemDeclaracao[];
    numeroNotaFiscal?: string;
}

export interface CriarPrePostagemResult {
    id?: string | number;
    codigoObjeto?: string;
    erro?: string;
    prePostagem?: any;
}

async function invoke(body: Record<string, any>): Promise<any> {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.functions.invoke('correios-prepostagem', { body });
    if (error) {
        let detalhe = error.message;
        try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
                const b = await ctx.json();
                if (b?.error || b?.erro) detalhe = b.error || b.erro;
            }
        } catch { /* mantém */ }
        throw new Error(detalhe || 'Falha na pré-postagem.');
    }
    return data;
}

export const correiosPrepostagemService = {
    ativo(): boolean {
        return import.meta.env.VITE_CORREIOS_ENABLED === 'true' && !!supabase;
    },

    /** Consulta endereço por CEP (para auto-preencher o formulário) */
    async consultarCep(cep: string): Promise<Partial<EnderecoPP> & { erro?: string }> {
        return invoke({ action: 'cep', cep });
    },

    /** Cria a pré-postagem; retorna id + código de rastreio */
    async criar(input: CriarPrePostagemInput): Promise<CriarPrePostagemResult> {
        return invoke({ action: 'criar', ...input });
    },

    /** Gera o rótulo (etiqueta) PDF em base64 */
    async gerarRotulo(params: { id?: string | number; codigoObjeto?: string }): Promise<{ pdfBase64?: string; idRecibo?: string | number; pendente?: boolean; msg?: string; erro?: string }> {
        return invoke({ action: 'rotulo', ...params });
    },
};
