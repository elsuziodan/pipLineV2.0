import { supabase } from '../config/supabase.js';

async function fixDuplicate() {
    const { data, error } = await supabase.from('clients').select('id, name').eq('name', 'HOJALATERIA Y PINTURA ORION');
    if (error) {
        console.error('Error fetching:', error.message);
        return;
    }
    
    if (data && data.length > 1) {
        console.log(`Found ${data.length} duplicates. Deleting the first one...`);
        const idToDelete = data[0].id;
        const { error: delError } = await supabase.from('clients').delete().eq('id', idToDelete);
        console.log(delError ? 'Error deleting: ' + delError.message : '✅ Successfully deleted duplicate.');
    } else {
        console.log('No duplicates found.');
    }
}

fixDuplicate();
