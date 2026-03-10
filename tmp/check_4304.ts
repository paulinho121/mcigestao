
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function check4304() {
  const { data } = await supabase.from('products').select('*').eq('id', '4304').single();
  console.log(`Product 4304: SC=${data.stock_sc}, Total=${data.total}`);
}
check4304();
