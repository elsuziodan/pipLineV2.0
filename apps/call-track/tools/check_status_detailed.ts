
import { supabase } from './src/config/supabase';

async function checkDetailedStatus() {
  const { data, error } = await supabase
    .from('clients')
    .select('status, tags');

  if (error) {
    console.error(error);
    return;
  }

  const counts: Record<string, number> = {};
  data.forEach(d => {
    counts[d.status] = (counts[d.status] || 0) + 1;
  });

  console.log('Status counts:', counts);
  
  const invalidLeads = data.filter(d => d.tags && d.tags.includes('invalido'));
  console.log('Invalid leads count:', invalidLeads.length);

  const nuovoLeads = data.filter(d => d.status === 'prospecto' && d.tags && d.tags.includes('nuevo'));
  console.log('Nuevo leads count:', nuovoLeads.length);

  process.exit(0);
}

checkDetailedStatus();
