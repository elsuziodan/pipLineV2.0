import { supabase } from './src/config/supabase.js';

async function inspectTable() {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('📄 Ejemplo de registro:', data);
    }
}

inspectTable();
