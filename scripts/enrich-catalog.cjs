const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!BROWSERBASE_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltam variáveis de ambiente (BROWSERBASE_API_KEY, VITE_SUPABASE_URL, etc)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Palavras-chave para ignorar (Peças de Reposição)
const IGNORE_KEYWORDS = [
    'CABO', 'CABLE', 'ASSY', 'SCREW', 'PARAFUSO', 'MODULE', 'MÓDULO', 
    'POWER ADAPTER', 'FONTE', 'ADAPTADOR', 'PEÇA', 'REPOSIÇÃO', 'PLUG', 'CONNECTOR', 'SUPORTE'
];

async function findImageWithSearchAPI(searchTerms) {
    try {
        const response = await axios.post('https://api.browserbase.com/v1/search', {
            query: `${searchTerms} equipment product`,
            numResults: 1
        }, {
            headers: {
                'x-bb-api-key': BROWSERBASE_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const results = response.data.results;
        
        if (results && results.length > 0) {
            // O campo 'image' é onde a Browserbase retorna o link da imagem representativa
            return results[0].image;
        }
        
        return null;
    } catch (error) {
        console.error(`  - Erro na Search API para "${searchTerms}":`, error.response?.data || error.message);
        return null;
    }
}

async function run() {
    console.log('🚀 Iniciando Automação (API Oficial Browserbase)...');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand')
        .or('image_url.is.null,image_url.eq.""')
        .order('total', { ascending: false });

    if (error) {
        console.error('Erro ao buscar produtos:', error);
        return;
    }

    // Filtrar equipamentos e ignorar códigos duplicados (.0)
    const equipmentList = products.filter(p => {
        const idStr = String(p.id);
        if (idStr.endsWith('.0')) return false; // Ignorar duplicatas .0
        
        const nameUpper = p.name.toUpperCase();
        return !IGNORE_KEYWORDS.some(keyword => nameUpper.includes(keyword));
    });

    console.log(`📦 Produtos para processar: ${equipmentList.length}`);

    for (let i = 0; i < equipmentList.length; i++) {
        const product = equipmentList[i];
        console.log(`[${i+1}/${equipmentList.length}] 🔎 Buscando: ${product.name}`);
        
        const searchTerms = `${product.name} ${product.brand || ''}`.trim();
        const imageUrl = await findImageWithSearchAPI(searchTerms);

        if (imageUrl) {
            // Tenta atualizar o ID original E a versão com .0 para garantir cobertura total
            const cleanId = String(product.id).endsWith('.0') ? String(product.id).slice(0, -2) : String(product.id);
            const idsToUpdate = [cleanId, `${cleanId}.0`];

            const { error: updateError } = await supabase
                .from('products')
                .update({ image_url: imageUrl })
                .in('id', idsToUpdate);

            if (updateError) {
                console.error(`  ❌ Erro ao salvar:`, updateError.message);
            } else {
                console.log(`  ✅ Atualizado IDs [${idsToUpdate.join(', ')}] com sucesso!`);
            }
        } else {
            console.log(`  ⚠️ Nenhuma imagem encontrada.`);
        }

        // Intervalo de segurança
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log('\n✨ Automação finalizada!');
}

run();
