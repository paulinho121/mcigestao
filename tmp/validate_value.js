import { createClient } from '@supabase/supabase-client';

const supabaseUrl = 'https://vqnkopzeysrqzxavaxls.supabase.co';
const supabaseKey = 'sb_publishable_ii10qNJA3915QWfxo5HKWA_gg8aF6Cz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealValue() {
    const { data, error } = await supabase
        .from('products')
        .select('total, price, last_purchase_price')
        .limit(5000);

    if (error) {
        console.error(error);
        return;
    }

    let totalStock = 0;
    let totalValueWithPlaceholder = 0;

    data.forEach(p => {
        totalStock += p.total || 0;
        const price = p.price || p.last_purchase_price || 1200;
        totalValueWithPlaceholder += (p.total || 0) * price;
    });

    console.log(`Total Products Fetched: ${data.length}`);
    console.log(`Total Stock Sum: ${totalStock}`);
    console.log(`Calculated Patrimonial Value (w/ 1200 fallback): R$ ${totalValueWithPlaceholder}`);
}

checkRealValue();
