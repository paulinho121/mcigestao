
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function runDeepAudit() {
  const code = '4303';
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  
  console.log('--- AUDITING API ---');
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  // 1. Any item containing "4303"
  const items4303 = items.filter((i:any) => i.Item && i.Item.includes(code));
  console.log(`Units found for "${code}" strings: ${items4303.length}`);
  items4303.forEach((m:any) => console.log(`  - ${m.Item}: Qty ${m.SaldoDisponivel?.Quantidade} (Total: ${m.SaldoAtual?.Quantidade})`));
  
  // 2. Any item containing "300C" (without the code)
  const items300C = items.filter((i:any) => i.Item && i.Item.includes('300C') && !i.Item.includes(code));
  console.log(`Units found for "300C" but not "${code}": ${items300C.length}`);
  items300C.forEach((m:any) => console.log(`  - ${m.Item}: Qty ${m.SaldoDisponivel?.Quantidade} (Total: ${m.SaldoAtual?.Quantidade})`));

  // 3. Check for duplicates in DB
  console.log('--- DB CHECK ---');
  const { data: dbItems } = await supabase.from('products').select('*').or(`id.ilike.%${code}%,name.ilike.%300C%`);
  dbItems?.forEach((p:any) => {
    console.log(`Product id: ${p.id}, Name: ${p.name}, Stock SC: ${p.stock_sc}`);
  });
}

runDeepAudit();
