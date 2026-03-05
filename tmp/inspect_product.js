import { createClient } from '@supabase/supabase-client';

const supabaseUrl = 'https://vqnkopzeysrqzxavaxls.supabase.co';
const supabaseKey = 'sb_publishable_ii10qNJA3915QWfxo5HKWA_gg8aF6Cz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProduct() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('id.eq.4557,id.eq.4557.0')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Product Data:', JSON.stringify(data, null, 2));
}

inspectProduct();
