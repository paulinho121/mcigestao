import { createClient } from '@supabase/supabase-client';

const supabaseUrl = 'https://vqnkopzeysrqzxavaxls.supabase.co';
const supabaseKey = 'sb_publishable_ii10qNJA3915QWfxo5HKWA_gg8aF6Cz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    try {
        const { data, count, error } = await supabase
            .from('products')
            .select('id, stock_ce, stock_sc, stock_sp, price, total', { count: 'exact' });

        if (error) {
            console.error('Error:', error);
            return;
        }

        console.log(`Total Products: ${count}`);
        if (data) {
            let totalItems = 0;
            let productsWithPrice = 0;
            let totalPrice = 0;
            data.forEach(p => {
                const stock = (p.stock_ce || 0) + (p.stock_sc || 0) + (p.stock_sp || 0);
                totalItems += stock;
                if (p.price && p.price > 0) {
                    productsWithPrice++;
                    totalPrice += stock * p.price;
                }
            });
            console.log(`Total Physical Items: ${totalItems}`);
            console.log(`Products with Price: ${productsWithPrice}`);
            console.log(`Total Calculated Value (with prices): R$ ${totalPrice}`);
            console.log(`Sample Price: ${data.find(p => p.price > 0)?.price || 'None'}`);
        }
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

checkStock();
