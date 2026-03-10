
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function findDups() {
  const { data } = await supabase.from('products').select('*').ilike('name', '%Amaran 300C%');
  data?.forEach(p => console.log(`ID: ${p.id}, Name: ${p.name}, Stock SC: ${p.stock_sc}`));
}
findDups();
