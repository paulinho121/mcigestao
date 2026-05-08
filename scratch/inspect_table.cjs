const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectTable() {
    console.log('🧐 Inspecionando estrutura da tabela products...');
    
    // Pega um exemplo de produto para ver o tipo real dos dados
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Erro ao buscar produto:', error.message);
        return;
    }

    if (data && data.length > 0) {
        const product = data[0];
        console.log('\nExemplo de Produto:');
        console.log(`ID: ${product.id} (Tipo: ${typeof product.id})`);
        console.log(`Nome: ${product.name}`);
        console.log(`Image URL: "${product.image_url}" (Tipo: ${typeof product.image_url})`);
        
        // Testa um update forçado com número vs string
        console.log('\n🧪 Testando UPDATE forçado com ID numérico...');
        const numericId = parseFloat(product.id);
        const { error: updateError, count } = await supabase
            .from('products')
            .update({ image_url: 'https://test-image.com/test.jpg' })
            .eq('id', numericId)
            .select();

        if (updateError) {
            console.error('❌ Erro no update numérico:', updateError.message);
        } else {
            console.log(`✅ Update numérico afetou ${data?.length || 0} linhas.`);
            console.log('Dados retornados:', data);
        }
    }
}

inspectTable();
