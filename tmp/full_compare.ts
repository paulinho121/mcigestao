
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function fullCompare() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const apiData = await resp.json() as any;
  const apiItems = apiData.EstoqueMercadoria || [];
  
  // Aggregate API
  const apiAgg = new Map<string, number>();
  apiItems.forEach((it:any) => {
    if (!it.Item) return;
    const parts = it.Item.split(' - ');
    const code = parts[0].trim();
    const qty = it.SaldoDisponivel?.Quantidade || 0;
    apiAgg.set(code, (apiAgg.get(code) || 0) + qty);
  });

  // Get all DB items
  const { data: dbItems } = await supabase.from('products').select('id, stock_sc, name');
  
  console.log('--- DISCREPANCIES (SC STOCK) ---');
  let found = 0;
  dbItems?.forEach(p => {
    const apiQty = apiAgg.get(p.id) || 0;
    if (p.stock_sc !== apiQty) {
      console.log(`Code ${p.id} (${p.name}): DB SC=${p.stock_sc}, API SC=${apiQty}`);
      found++;
    }
  });
  
  if (found === 0) console.log('All SC stocks match the last API sync.');
  else console.log(`Found ${found} items that haven't been synced or differ from current API.`);
}
fullCompare();
