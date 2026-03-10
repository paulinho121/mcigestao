
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkTotalStock() {
  let { data: products, error } = await supabase
    .from('products')
    .select('id, name, stock_ce, stock_sc, stock_sp, price, last_purchase_price');

  if (error) {
    console.error('Error:', error);
    return;
  }

  let totalValue = 0;
  let totalUnits = 0;

  products?.forEach(p => {
    const totalStock = (p.stock_ce || 0) + (p.stock_sc || 0) + (p.stock_sp || 0);
    if (totalStock > 0) {
        const price = p.price || p.last_purchase_price || 1200;
        const value = totalStock * price;
        totalValue += value;
        totalUnits += totalStock;
        if (value > 10000) {
            console.log(`High value product: ${p.id} (${p.name}) - Stock: ${totalStock}, Price: ${price}, Value: ${value}`);
        }
    }
  });

  console.log(`Total units across all branches: ${totalUnits}`);
  console.log(`Calculated Total Value (with 1200 fallback): ${totalValue}`);
  console.log(`Rounded value for UI: R$ ${(totalValue / 1000000).toFixed(1)}M`);
}

checkTotalStock();
