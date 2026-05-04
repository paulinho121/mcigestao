const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Go up one level since this script is in scratch/
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env');
    console.log('Cwd:', process.cwd());
    console.log('Dirname:', __dirname);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error, count } = await supabase
        .from('products')
        .select('id, name', { count: 'exact' })
        .or('image_url.is.null,image_url.eq.""');

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log('Total products missing images:', count);
    if (data) {
        console.log('Sample:');
        console.log(JSON.stringify(data.slice(0, 10), null, 2));
    }
}

run();
