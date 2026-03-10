
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkProduct() {
  const code = '4303';
  console.log(`Checking product code: ${code}`);

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`id.eq.${code},id.eq.${code}.0`);

  if (error) {
    console.error('Error fetching product:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Product not found in database.');
  } else {
    console.log('Product(s) found in DB:');
    data.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}, SC: ${p.stock_sc}, CE: ${p.stock_ce}, SP: ${p.stock_sp}, Total: ${p.total}`);
    });
  }

  // Check SC API
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  console.log(`Checking SC API for items starting with ${code}...`);
  
  try {
    const response = await fetch(url);
    const apiData = await response.json() as any;
    const items = apiData.EstoqueMercadoria || [];
    
    const relevantItems = items.filter((i: any) => i.Item && (i.Item.startsWith(code) || i.Item.includes(code)));
    
    if (relevantItems.length > 0) {
      console.log(`Found ${relevantItems.length} items in SC API:`);
      relevantItems.forEach((item: any) => {
        console.log(`Item String: "${item.Item}"`);
        console.log(`Quantidade: ${item.SaldoDisponivel?.Quantidade}`);
        console.log(`Valor: ${item.SaldoDisponivel?.Valor}`);
        console.log('---');
      });
    } else {
      console.log(`No items for ${code} found in SC API.`);
    }
  } catch (e: any) {
    console.error('API Error:', e.message);
  }
}

checkProduct();
