
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkProducts() {
  const { data, count, error } = await supabase
    .from('products')
    .select('id, name, price, stock_sc, total', { count: 'exact' });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total items in database: ${count}`);
  const hasPrice = data.filter(p => p.price && p.price > 0).length;
  console.log(`Items with price > 0: ${hasPrice}`);
  
  const totalStock = data.reduce((acc, p) => acc + (p.total || 0), 0);
  console.log(`Total stock items across all products: ${totalStock}`);
  
  const top10 = data.sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 10);
  console.log('Top 10 products by total stock:');
  top10.forEach(p => console.log(` - ${p.id}: ${p.name} (Stock: ${p.total}, Price: ${p.price})`));
}

checkProducts();
