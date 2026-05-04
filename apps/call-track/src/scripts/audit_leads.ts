
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLifecycle() {
    // 1. ¿Cuántos LIQUIDADO y CANCELADO hay?
    const { data: liquidados } = await supabase
        .from('clients')
        .select('name, status, board_moved_at')
        .eq('status', 'LIQUIDADO');

    const { data: cancelados } = await supabase
        .from('clients')
        .select('name, status, board_moved_at')
        .eq('status', 'CANCELADO');

    console.log(`LIQUIDADOS: ${liquidados?.length || 0}`);
    liquidados?.forEach(c => console.log(`  - ${c.name} | Moved: ${c.board_moved_at}`));

    console.log(`\nCANCELADOS: ${cancelados?.length || 0}`);
    cancelados?.forEach(c => console.log(`  - ${c.name} | Moved: ${c.board_moved_at}`));

    // 2. ¿Existe algún campo de "archivado"?
    const { data: sample } = await supabase
        .from('clients')
        .select('*')
        .limit(1);

    if (sample && sample.length > 0) {
        console.log('\n--- CAMPOS DE LA TABLA clients ---');
        console.log(Object.keys(sample[0]).join(', '));
    }
}

checkLifecycle();
