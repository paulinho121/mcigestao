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
    const updates = [
        { id: '4954', url: 'https://www.bbplight.nl/contents/media/l_Astera-FP2-SB.JPG' },
        { id: '5059', url: 'https://www.bhphotovideo.com/images/images2500x2500/falcam_3230_f22_f38_f50_quick_release_1747805.jpg' }
    ];

    for (const item of updates) {
        console.log(`Updating product ${item.id} with image ${item.url}...`);
        const { error } = await supabase
            .from('products')
            .update({ image_url: item.url })
            .eq('id', item.id);

        if (error) {
            console.error(`Error updating product ${item.id}:`, error);
        } else {
            console.log(`Product ${item.id} updated successfully!`);
        }
    }
}

run();
