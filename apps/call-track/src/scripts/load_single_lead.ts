import * as fs from 'fs';
import { supabase } from '../config/supabase.js';
import { normalizeToInternational } from '../whatsapp/utils.js';

async function loadSingle() {
    const csvPath = 'apps/scrapper/src/data/exports/querétaro_20260501_150136/shortlist.csv';
    
    if (!fs.existsSync(csvPath)) {
        console.error('CSV not found');
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
        console.error('CSV empty');
        return;
    }

    // Get headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Get first data row
    const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));
    
    const row: any = {};
    headers.forEach((h, i) => row[h] = values[i]);

    console.log('--- UPLOADING SINGLE LEAD ---');
    console.log('Business:', row.business_name || row.name);
    
    const rawPhone = row.phone || '';
    const normalizedPhone = normalizeToInternational(rawPhone);

    const { error } = await supabase.from('clients').insert([{
        name: row.business_name || row.name || 'Sin nombre',
        phone: normalizedPhone,
        address: row.address || '',
        status: 'prospecto',
        tags: ['nuevo', 'test_manual'],
        is_board_suggested: true,
        metadata: {
            source: 'manual_test_single',
            loaded_at: new Date().toISOString(),
            listing_url: row.listing_url || '',
        }
    }]);

    if (error) {
        console.error('Error inserting:', error);
    } else {
        console.log('✅ Success! Lead uploaded.');
    }
}

loadSingle();
