
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkEverySingleProduct() {
  let allProducts: any[] = [];
  let from = 0;
  let to = 999;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from('products')
      .select('id, stock_ce, stock_sc, stock_sp, price, last_purchase_price, total')
      .range(from, to);

    if (error) {
      console.error('Error at offset', from, ':', error);
      break;
    }

    if (!data || data.length === 0) {
      finished = true;
    } else {
      allProducts = [...allProducts, ...data];
      from += 1000;
      to += 1000;
      if (data.length < 1000) finished = true;
    }
  }

  console.log(`Total products fetched manually: ${allProducts.length}`);
  const units = allProducts.reduce((acc, p) => acc + (p.stock_ce || 0) + (p.stock_sc || 0) + (p.stock_sp || 0), 0);
  console.log(`Units found: ${units}`);
  
  const value = allProducts.reduce((acc, p) => {
    const totalStock = (p.stock_ce || 0) + (p.stock_sc || 0) + (p.stock_sp || 0);
    const price = p.price || p.last_purchase_price || 1200;
    return acc + (totalStock * price);
  }, 0);
  
  console.log(`Calculated total value: ${value}`);
}

checkEverySingleProduct();
