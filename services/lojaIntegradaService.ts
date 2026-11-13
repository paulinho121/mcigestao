// ─────────────────────────────────────────────────────────────────────────────
// Sincronização de nomes com a Loja Integrada (mci.tv)
//
// Conversa com a Edge Function `loja-integrada-nomes` (chave da API só no servidor).
// Casa o SKU da loja com `products.id` e atualiza apenas `products.name`.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

export interface PrecoLoja {
    idProduto: number;
    cheio: string | null;
    promocional: string | null;
    sobConsulta: boolean;
}

export interface DiferencaPreco {
    id: string;
    nome: string;
    precoAtual: number | null;
    precoSite: number;
}

export interface ResultadoPrecos {
    diferencas: DiferencaPreco[];
    iguais: number;
    semPrecoNoSite: number; // produto casado, mas sem preço cheio válido na loja
}

export interface ProdutoLoja {
    id?: number;
    sku: string;
    nome: string;
    ativo: boolean;
    url: string;
    categorias: number[];
}

export interface CategoriaLoja {
    id: number;
    nome: string;
    pai: number | null;
}

export interface DiferencaTipo {
    id: string;
    tipoAtual: string;
    tipoSite: string;
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

    /** Preços (cheio/promocional) de todos os produtos da loja. */
    async buscarPrecos(onProgress?: (lidos: number) => void): Promise<PrecoLoja[]> {
        if (!supabase) throw new Error('Supabase não configurado.');
        const todos: PrecoLoja[] = [];
        let offset = 0;
        for (let guarda = 0; guarda < 50; guarda++) {
            const { data, error } = await supabase.functions.invoke('loja-integrada-nomes', { body: { acao: 'precos', offset } });
            if (error) throw new Error(await extrairErro(error));
            if (data?.configured === false) throw new Error(data.error || 'Loja Integrada não configurada.');
            if (data?.error) throw new Error(data.error);
            todos.push(...((data?.precos ?? []) as PrecoLoja[]));
            onProgress?.(todos.length);
            if (data?.proximoOffset == null) break;
            offset = data.proximoOffset;
        }
        return todos;
    },

    /** Compara o preço cheio do site com `products.price` (SKU ↔ id). */
    async compararPrecos(loja: ProdutoLoja[], precos: PrecoLoja[]): Promise<ResultadoPrecos> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const cheioPorProduto = new Map<number, PrecoLoja>(precos.map((p) => [p.idProduto, p]));

        const atual = new Map<string, { id: string; name: string; price: number | null }>();
        const PAGE = 1000;
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await supabase.from('products').select('id, name, price').not('id', 'like', '%.0').order('id').range(from, from + PAGE - 1);
            if (error) throw new Error(error.message);
            for (const p of data ?? []) atual.set(chave(p.id), { id: p.id, name: p.name ?? '', price: p.price == null ? null : Number(p.price) });
            if (!data || data.length < PAGE) break;
        }

        const diferencas: DiferencaPreco[] = [];
        let iguais = 0;
        let semPrecoNoSite = 0;
        const vistos = new Set<string>();
        for (const l of loja) {
            if (!l.sku || l.id == null) continue;
            const k = chave(l.sku);
            if (vistos.has(k)) continue;
            vistos.add(k);
            const p = atual.get(k);
            if (!p) continue;

            const pr = cheioPorProduto.get(l.id);
            const site = pr && !pr.sobConsulta && pr.cheio != null ? Number(pr.cheio) : NaN;
            if (!(site > 0)) { semPrecoNoSite++; continue; }

            const precoSite = Math.round(site * 100) / 100;
            if (p.price != null && Math.abs(p.price - precoSite) < 0.005) { iguais++; continue; }
            diferencas.push({ id: p.id, nome: p.name, precoAtual: p.price, precoSite });
        }
        diferencas.sort((a, b) => a.id.localeCompare(b.id));
        return { diferencas, iguais, semPrecoNoSite };
    },

    /** Grava `products.price` com o preço cheio do site (só esse campo). */
    async aplicarPrecos(itens: DiferencaPreco[], onProgress?: (feitos: number) => void): Promise<{ ok: number; falhas: string[] }> {
        if (!supabase) throw new Error('Supabase não configurado.');
        let ok = 0;
        const falhas: string[] = [];
        const LOTE = 10;
        for (let i = 0; i < itens.length; i += LOTE) {
            const res = await Promise.all(itens.slice(i, i + LOTE).map(async (it) => {
                const { data, error } = await supabase!.from('products').update({ price: it.precoSite }).eq('id', it.id).select('id');
                return error || !data?.length ? it.id : null;
            }));
            for (const r of res) { if (r) falhas.push(r); else ok++; }
            onProgress?.(ok + falhas.length);
        }
        return { ok, falhas };
    },

    /** Árvore de categorias da loja. */
    async buscarCategorias(): Promise<CategoriaLoja[]> {
        if (!supabase) throw new Error('Supabase não configurado.');
        const { data, error } = await supabase.functions.invoke('loja-integrada-nomes', { body: { acao: 'categorias' } });
        if (error) throw new Error(await extrairErro(error));
        if (data?.configured === false) throw new Error(data.error || 'Loja Integrada não configurada.');
        if (data?.error) throw new Error(data.error);
        return (data?.categorias ?? []) as CategoriaLoja[];
    },

    /**
     * Define o tipo de cada produto a partir das categorias da loja marcadas como "tipo".
     * Se o produto está em mais de uma categoria de tipo, vale a mais específica (mais funda na árvore).
     */
    async compararTipos(loja: ProdutoLoja[], categorias: CategoriaLoja[], tiposIds: Set<number>): Promise<DiferencaTipo[]> {
        if (!supabase) throw new Error('Supabase não configurado.');

        const porId = new Map(categorias.map((c) => [c.id, c]));
        const profundidade = (id: number): number => {
            let n = 0;
            for (let c = porId.get(id); c?.pai != null && n < 20; c = porId.get(c.pai)) n++;
            return n;
        };

        const { data, error } = await (async () => {
            const all: { id: string; tipo: string | null }[] = [];
            const PAGE = 1000;
            for (let from = 0; ; from += PAGE) {
                const r = await supabase!.from('products').select('id, tipo').not('id', 'like', '%.0').order('id').range(from, from + PAGE - 1);
                if (r.error) return { data: null, error: r.error };
                all.push(...(r.data ?? []));
                if (!r.data || r.data.length < PAGE) break;
            }
            return { data: all, error: null };
        })();
        if (error) throw new Error(error.message);
        const atual = new Map((data ?? []).map((p) => [chave(p.id), p]));

        const resultado: DiferencaTipo[] = [];
        const vistos = new Set<string>();
        for (const l of loja) {
            const k = chave(l.sku);
            if (!l.sku || vistos.has(k)) continue;
            vistos.add(k);
            const p = atual.get(k);
            if (!p) continue;

            const escolhida = l.categorias
                .filter((id) => tiposIds.has(id) && porId.has(id))
                .sort((a, b) => profundidade(b) - profundidade(a))[0];
            if (escolhida === undefined) continue;

            const tipoSite = porId.get(escolhida)!.nome;
            if ((p.tipo ?? '') !== tipoSite) resultado.push({ id: p.id, tipoAtual: p.tipo ?? '', tipoSite });
        }
        return resultado.sort((a, b) => a.id.localeCompare(b.id));
    },

    /** Grava `products.tipo` (só esse campo). */
    async aplicarTipos(itens: DiferencaTipo[], onProgress?: (feitos: number) => void): Promise<{ ok: number; falhas: string[] }> {
        if (!supabase) throw new Error('Supabase não configurado.');
        let ok = 0;
        const falhas: string[] = [];
        const LOTE = 10;
        for (let i = 0; i < itens.length; i += LOTE) {
            const res = await Promise.all(itens.slice(i, i + LOTE).map(async (it) => {
                const { data, error } = await supabase!.from('products').update({ tipo: it.tipoSite }).eq('id', it.id).select('id');
                return error || !data?.length ? it.id : null;
            }));
            for (const r of res) { if (r) falhas.push(r); else ok++; }
            onProgress?.(ok + falhas.length);
        }
        return { ok, falhas };
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
