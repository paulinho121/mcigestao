const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BROWSERBASE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Faltam variáveis de ambiente (BROWSERBASE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, etc)');
    process.exit(1);
}

// Usar SERVICE_ROLE_KEY para ignorar RLS e garantir que os dados sejam salvos
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Palavras-chave para ignorar (Peças de Reposição)
const IGNORE_KEYWORDS = [
    'CABO', 'CABLE', 'ASSY', 'SCREW', 'PARAFUSO', 'MODULE', 'MÓDULO', 
    'POWER ADAPTER', 'FONTE', 'ADAPTADOR', 'PEÇA', 'REPOSIÇÃO', 'PLUG', 'CONNECTOR', 'SUPORTE'
];

const puppeteer = require('puppeteer-core');

async function findImageWithPuppeteer(searchTerms) {
    let browser;
    try {
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}`,
        });

        const page = await browser.newPage();
        // User Agent para evitar detecção básica
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerms + ' photography product')}`;
        
        await page.goto(googleUrl, { waitUntil: 'networkidle2' });
        
        // Espera um pouco para carregar as imagens reais (não base64)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extrai o primeiro link de imagem real do Google
        const imageUrl = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            // Buscamos imagens que tenham link real (http), não sejam logos e tenham tamanho mínimo
            const validImg = imgs.find(img => {
                const src = img.src || '';
                return src.startsWith('http') && 
                       !src.includes('googlelogo') && 
                       !src.includes('gstatic') &&
                       img.width > 120;
            });
            return validImg ? validImg.src : null;
        });

        return imageUrl;
    } catch (error) {
        console.error(`  - Erro no Navegador para "${searchTerms}":`, error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

async function findImageInPage(page, searchTerms) {
    try {
        const searchQuery = `${searchTerms} photography product`;
        const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
        
        await page.goto(googleUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Espera um pouco para carregar imagens reais (tempo curto para "identificação fácil")
        await new Promise(resolve => setTimeout(resolve, 1500));

        const imageUrl = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const validImg = imgs.find(img => {
                const src = img.src || '';
                return src.startsWith('http') && !src.includes('googlelogo') && img.width > 200;
            });
            return validImg ? validImg.src : null;
        });

        return imageUrl;
    } catch (error) {
        console.error(`  - Erro ao buscar "${searchTerms}":`, error.message);
        return null;
    }
}

async function run() {
    console.log('🚀 Iniciando Automação (Modo Reuso de Navegador)...');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand')
        .or('image_url.is.null,image_url.eq.""')
        .order('total', { ascending: false });

    if (error) {
        console.error('Erro ao buscar produtos:', error);
        return;
    }

    const equipmentList = products.filter(p => {
        const idStr = String(p.id);
        if (idStr.endsWith('.0')) return false;
        const nameUpper = p.name.toUpperCase();
        return !IGNORE_KEYWORDS.some(keyword => nameUpper.includes(keyword));
    });

    console.log(`📦 Produtos para processar: ${equipmentList.length}`);

    let browser;
    try {
        console.log('🔌 Conectando ao navegador mestre...');
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}`,
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        for (let i = 0; i < equipmentList.length; i++) {
            const product = equipmentList[i];
            
            // 1. IGNORAR COMPLETAMENTE IDs QUE TERMINAM COM .0
            if (String(product.id).endsWith('.0')) {
                continue;
            }

            console.log(`[${i+1}/${equipmentList.length}] 🔎 Buscando: ${product.name}`);
            
            const searchTerms = `${product.name} ${product.brand || ''}`.trim();
            
            // 2. BUSCA COM CRITÉRIO DE "IMAGEM FÁCIL"
            const imageUrl = await findImageInPage(page, searchTerms);

            if (imageUrl) {
                // Atualiza APENAS o ID principal
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ image_url: imageUrl })
                    .eq('id', product.id);

                if (updateError) {
                    console.error(`  ❌ Erro ao salvar:`, updateError.message);
                } else {
                    console.log(`  ✅ Imagem identificada e salva para ID: ${product.id}`);
                }
            } else {
                // Pula para o próximo sem salvar nada se não for "fácil"
                console.log(`  ⏩ Pulando: Imagem não identificada facilmente.`);
            }

            // Intervalo curto entre itens
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    } catch (err) {
        console.error('💥 Erro fatal no processo:', err.message);
    } finally {
        if (browser) await browser.close();
        console.log('\n✨ Automação finalizada!');
    }
}

run();
