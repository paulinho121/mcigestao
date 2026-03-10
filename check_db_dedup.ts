
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Helper to clean IDs (remove .0 suffix) and deduplicate
const cleanAndDeduplicate = (items: any[]): any[] => {
  const map = new Map<string, any>();

  for (const item of items) {
    // Remove .0 suffix if present
    const cleanId = item.id.endsWith('.0') ? item.id.slice(0, -2) : item.id;
    const existing = map.get(cleanId);

    const stock_ce = Number(item.stock_ce || 0);
    const stock_sc = Number(item.stock_sc || 0);
    const stock_sp = Number(item.stock_sp || 0);

    if (existing) {
      existing.stock_ce += stock_ce;
      existing.stock_sc += stock_sc;
      existing.stock_sp += stock_sp;
      existing.total = existing.stock_ce + existing.stock_sc + existing.stock_sp;
      // Keep price if existing is NULL and item has price
      if ((!existing.price || existing.price === 0) && item.price > 0) existing.price = item.price;
    } else {
      map.set(cleanId, {
        ...item,
        id: cleanId,
        stock_ce,
        stock_sc,
        stock_sp,
        total: stock_ce + stock_sc + stock_sp
      });
    }
  }
  return Array.from(map.values());
};

async function checkDeduplicated() {
  const { data, count, error } = await supabase
    .from('products')
    .select('id, name, price, stock_sc, stock_ce, stock_sp, total');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const cleanRecords = cleanAndDeduplicate(data);
  console.log(`Initial records: ${data.length}`);
  console.log(`Deduplicated records: ${cleanRecords.length}`);
  
  const totalStock = cleanRecords.reduce((acc, p) => acc + (p.total || 0), 0);
  console.log(`Total stock items deduped: ${totalStock}`);
  
  const valueFallback = cleanRecords.reduce((acc, p) => {
    const price = p.price || 1200;
    return acc + (p.total * price);
  }, 0);
  console.log(`Total Value deduped with 1200 fallback: ${valueFallback}`);
}

checkDeduplicated();
