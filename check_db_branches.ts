
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkStocks() {
  const { data, error } = await supabase
    .from('products')
    .select('id, stock_ce, stock_sc, stock_sp, total, price');

  if (error) {
    console.error('Error:', error);
    return;
  }

  let totalCE = 0;
  let totalSC = 0;
  let totalSP = 0;
  let totalOverall = 0;

  data.forEach(p => {
    totalCE += (p.stock_ce || 0);
    totalSC += (p.stock_sc || 0);
    totalSP += (p.stock_sp || 0);
    totalOverall += (p.total || 0);
  });

  console.log(`Total CE: ${totalCE}`);
  console.log(`Total SC: ${totalSC}`);
  console.log(`Total SP: ${totalSP}`);
  console.log(`Total Overall (from total column): ${totalOverall}`);
  
  const valueFallback = data.reduce((acc, p) => {
    const stock = (p.stock_ce || 0) + (p.stock_sc || 0) + (p.stock_sp || 0);
    const price = p.price || 1200;
    return acc + (stock * price);
  }, 0);
  
  console.log(`Total Value with 1200 fallback: ${valueFallback}`);
}

checkStocks();
