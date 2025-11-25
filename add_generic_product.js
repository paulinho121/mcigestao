import { createClient } from '@supabase/supabase-js';

// Você precisa substituir estas variáveis com suas credenciais do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGenericProduct() {
    console.log('🔄 Adicionando produto genérico ao banco de dados...');

    try {
        const { data, error } = await supabase
            .from('products')
            .upsert({
                id: 'GENERICO-001',
                name: 'Produto Genérico - Item Sem Código',
                brand: 'N/A',
                stock_ce: 0,
                stock_sc: 0,
                stock_sp: 0,
                total: 0,
                reserved: 0
            }, {
                onConflict: 'id'
            })
            .select();

        if (error) {
            console.error('❌ Erro ao adicionar produto genérico:', error);
            process.exit(1);
        }

        console.log('✅ Produto genérico adicionado com sucesso!');
        console.log('📦 Detalhes:', data);

        // Verificar se o produto foi inserido
        const { data: checkData, error: checkError } = await supabase
            .from('products')
            .select('*')
            .eq('id', 'GENERICO-001')
            .single();

        if (checkError) {
            console.error('❌ Erro ao verificar produto:', checkError);
        } else {
            console.log('✅ Verificação bem-sucedida:', checkData);
        }

    } catch (err) {
        console.error('❌ Erro inesperado:', err);
        process.exit(1);
    }
}

addGenericProduct();
