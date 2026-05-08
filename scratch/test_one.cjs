const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugUpdate() {
    const productId = '3705';
    const imageUrl = 'https://cdn.awsli.com.br/800x800/555/555190/produto/21502455/f7ff3d5987.jpg';
    
    console.log(`\n🧪 Forçando imagem para ID: ${productId}`);

    try {
        console.log('1. Atualizando o banco de dados...');
        const { error, data } = await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .in('id', [productId, `${productId}.0`]);

        if (error) {
            console.error('❌ Erro no Supabase:', error.message);
        } else {
            console.log('✨ SUCESSO! Banco de dados atualizado para o item 3705.');
        }
    } catch (err) {
        console.error('💥 Erro fatal:', err.message);
    } finally {
        console.log('\n🏁 Processo finalizado.');
    }
}

debugUpdate();
