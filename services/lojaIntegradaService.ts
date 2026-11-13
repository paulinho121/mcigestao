// ─────────────────────────────────────────────────────────────────────────────
// Sincronização de nomes com a Loja Integrada (mci.tv)
//
// Conversa com a Edge Function `loja-integrada-nomes` (chave da API só no servidor).
// Casa o SKU da loja com `products.id` e atualiza apenas `products.name`.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export interface ProdutoLoja {
    sku: string;
    nome: string;
    ativo: boolean;
    url: string;
}

export interface DiferencaNome {
    id: string;
    nomeAtual: string;
    nomeSite: string;
    ativo: boolean;
    url: string;
}

export interface ResultadoComparacao {
    totalLoja: number;
    iguais: number;
    diferencas: DiferencaNome[];
    semCorrespondencia: ProdutoLoja[]; // SKU da loja que não existe no app
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
    return detalhe || 'Falha ao consultar a Loja Integrada.';
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const chave = (s: string) => s.trim().toLowerCase();

async function fetchAllProducts(): Promise<{ id: string; name: string }[]> {
    const PAGE = 1000;
    const all: { id: string; name: string }[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase!
            .from('products')
            .select('id, name')
            .not('id', 'like', '%.0')
            .order('id')
            .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        all.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
    }
    return all;
}

export const lojaIntegradaService = {
    /** Lê todo o catálogo da loja (várias chamadas se for grande). */
    async buscarCatalogo(onProgress?: (lidos: number, total: number) => void): Promise<ProdutoLoja[]> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const todos: ProdutoLoja[] = [];
        let offset = 0;
        for (let guarda = 0; guarda < 50; guarda++) {
            const { data, error } = await supabase.functions.invoke('loja-integrada-nomes', { body: { offset } });
            if (error) throw new Error(await extrairErro(error));
            if (data?.configured === false) throw new Error(data.error || 'Loja Integrada não configurada.');
            if (data?.error) throw new Error(data.error);

            todos.push(...((data?.items ?? []) as ProdutoLoja[]));
            onProgress?.(todos.length, data?.total ?? todos.length);

            const proximo = data?.proximoOffset;
            if (proximo == null) break;
            offset = proximo;
        }
        return todos;
    },

    /** Compara o catálogo da loja com os produtos do app (SKU ↔ id). */
    async comparar(loja: ProdutoLoja[]): Promise<ResultadoComparacao> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const produtos = await fetchAllProducts();
        const porId = new Map(produtos.map((p) => [chave(p.id), p]));

        const diferencas: DiferencaNome[] = [];
        const semCorrespondencia: ProdutoLoja[] = [];
        let iguais = 0;
        const vistos = new Set<string>();

        for (const l of loja) {
            if (!l.sku || !l.nome) continue;
            const k = chave(l.sku);
            if (vistos.has(k)) continue; // SKU repetido na loja: considera o primeiro
            vistos.add(k);

            const p = porId.get(k);
            if (!p) { semCorrespondencia.push(l); continue; }
            if (norm(p.name ?? '') === norm(l.nome)) { iguais++; continue; }
            diferencas.push({ id: p.id, nomeAtual: p.name ?? '', nomeSite: norm(l.nome), ativo: l.ativo, url: l.url });
        }

        diferencas.sort((a, b) => a.id.localeCompare(b.id));
        return { totalLoja: loja.length, iguais, diferencas, semCorrespondencia };
    },

    /** Aplica os nomes do site (somente `products.name`). Retorna quantos foram atualizados. */
    async aplicar(itens: DiferencaNome[], onProgress?: (feitos: number) => void): Promise<{ ok: number; falhas: string[] }> {
        if (!supabase) throw new Error('Supabase não configurado.');

        let ok = 0;
        const falhas: string[] = [];
        const LOTE = 10;
        for (let i = 0; i < itens.length; i += LOTE) {
            const lote = itens.slice(i, i + LOTE);
            const res = await Promise.all(lote.map(async (it) => {
                const { data, error } = await supabase!.from('products').update({ name: it.nomeSite }).eq('id', it.id).select('id');
                return error || !data?.length ? it.id : null; // 0 linhas = bloqueado por permissão
            }));
            for (const r of res) { if (r) falhas.push(r); else ok++; }
            onProgress?.(ok + falhas.length);
        }
        return { ok, falhas };
    },
};
