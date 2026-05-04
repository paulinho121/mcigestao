const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { data } = await supabase
        .from('products')
        .select('id, name, image_url')
        .or('id.eq.3705,id.eq.3705.0');
    console.log(JSON.stringify(data, null, 2));
}
run();
