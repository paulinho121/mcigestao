// ─────────────────────────────────────────────────────────────────────────────
// Modelos 3D (.glb) dos produtos, para o visualizador 3D / Realidade Aumentada
//
// Arquivo no Storage (bucket público `modelos-3d`) + endereço em `products.model_glb_url`.
// O modelo deve estar em ESCALA REAL (1 unidade = 1 metro): o AR usa esse tamanho.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

const BUCKET = 'modelos-3d';
export const TAMANHO_MAX_MB = 25;

export interface ProdutoComModelo {
    id: string;
    name: string;
    brand: string;
    image_url?: string;
    model_glb_url?: string | null;
}

export const modelo3dService = {
    /** A coluna `model_glb_url` existe no banco? (false = o SQL de modelos 3D ainda não foi rodado) */
    async colunaDisponivel(): Promise<boolean> {
        if (!supabase) return false;
        const { error } = await supabase.from('products').select('model_glb_url').limit(1);
        return !error;
    },

    async buscarProdutos(termo: string, comColuna = true): Promise<ProdutoComModelo[]> {
        if (!supabase) return [];
        const t = termo.trim().replace(/[%,()]/g, ' ');
        if (t.length < 2) return [];
        const { data, error } = await supabase
            .from('products')
            .select(comColuna ? 'id, name, brand, image_url, model_glb_url' : 'id, name, brand, image_url')
            .not('id', 'like', '%.0')
            .or(`id.ilike.%${t}%,name.ilike.%${t}%`)
            .order('name')
            .limit(30);
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as ProdutoComModelo[];
    },

    /** Envia o .glb e registra no produto. Devolve o endereço público. */
    async enviar(produtoId: string, arquivo: File): Promise<string> {
        if (!supabase) throw new Error('Supabase não configurado.');
        if (!/\.glb$/i.test(arquivo.name)) throw new Error('Envie um arquivo .glb (modelo 3D binário).');
        if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) throw new Error(`O arquivo passa de ${TAMANHO_MAX_MB} MB. Reduza o modelo (texturas e polígonos).`);

        // confere o cabeçalho "glTF" para não aceitar qualquer arquivo renomeado
        const cab = new Uint8Array(await arquivo.slice(0, 4).arrayBuffer());
        if (String.fromCharCode(...cab) !== 'glTF') throw new Error('Este arquivo não é um .glb válido.');

        const path = `${produtoId.replace(/[^\w.-]/g, '_')}/${Date.now()}.glb`;
        const up = await supabase.storage.from(BUCKET).upload(path, arquivo, { contentType: 'model/gltf-binary', upsert: false });
        if (up.error) throw new Error(`Não foi possível enviar o modelo (${up.error.message}). Rodou o SQL de modelos 3D e está logado?`);

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const { data, error } = await supabase.from('products').update({ model_glb_url: pub.publicUrl }).eq('id', produtoId).select('id');
        if (error || !data?.length) throw new Error(`Modelo enviado, mas o produto não foi atualizado (${error?.message ?? 'sem permissão'}). Rodou o SQL de modelos 3D?`);
        return pub.publicUrl;
    },

    /** Tira o modelo do produto (o arquivo antigo fica no Storage). */
    async remover(produtoId: string): Promise<void> {
        if (!supabase) throw new Error('Supabase não configurado.');
        const { data, error } = await supabase.from('products').update({ model_glb_url: null }).eq('id', produtoId).select('id');
        if (error || !data?.length) throw new Error(error?.message ?? 'Sem permissão para alterar o produto.');
    },
};
