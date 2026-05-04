const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const productId = '4423';
    const imageUrl = 'https://cdn.awsli.com.br/600x700/555/555190/produto/163073438/4a43c5721f.jpg';

    console.log(`Updating product ${productId} with image ${imageUrl}...`);

    const { error } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);

    if (error) {
        console.error('Error updating product:', error);
        process.exit(1);
    }

    console.log('Product updated successfully!');
}

run();
