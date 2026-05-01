
import { supabase } from './src/config/supabase';

async function auditAndReset() {
  const { data: leads, error } = await supabase
    .from('clients')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- AUDIT ---');
  
  const prospectosNoNuevo = leads.filter(l => l.status === 'prospecto' && (!l.tags || !l.tags.includes('nuevo')));
  console.log('Prospectos without "nuevo" tag:', prospectosNoNuevo.length);
  prospectosNoNuevo.forEach(l => {
    console.log(`- ${l.name} | Tags: ${JSON.stringify(l.tags)}`);
  });

  const invalidLeads = leads.filter(l => l.tags && l.tags.includes('invalido'));
  console.log('\nInvalid leads (marked as contactado + invalido):', invalidLeads.length);
  
  let resetCount = 0;
  for (const lead of invalidLeads) {
    const phone = lead.phone;
    // Check if phone is valid (at least 10 digits)
    const clean = phone ? phone.replace(/\D/g, '') : '';
    if (clean.length >= 10 && phone !== 'False') {
      console.log(`Resetting ${lead.name} (${phone}) to 'prospecto' + 'nuevo'`);
      const newTags = lead.tags.filter((t: string) => t !== 'invalido');
      if (!newTags.includes('nuevo')) newTags.push('nuevo');
      
      await supabase.from('clients').update({
        status: 'prospecto',
        tags: newTags,
        metadata: { ...lead.metadata, bot_status: null, last_bot_update: null }
      }).eq('id', lead.id);
      resetCount++;
    } else {
      console.log(`Lead ${lead.name} has truly invalid phone: ${phone}`);
    }
  }
  
  console.log(`\nTotal reset: ${resetCount}`);
  
  // Also reset the 5 prospectos without tags to 'nuevo' if they look okay
  for (const lead of prospectosNoNuevo) {
      console.log(`Adding 'nuevo' tag to ${lead.name}`);
      const newTags = Array.from(new Set([...(lead.tags || []), 'nuevo']));
      await supabase.from('clients').update({
          tags: newTags
      }).eq('id', lead.id);
  }

  process.exit(0);
}

auditAndReset();
