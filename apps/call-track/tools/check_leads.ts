
import { supabase } from './src/config/supabase';

async function checkStatus() {
  console.log('--- DB STATUS CHECK ---');
  
  // Total clients
  const { count: total, error: e1 } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  // Ready prospects
  const { count: ready, error: e2 } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'prospecto')
    .contains('tags', ['nuevo']);

  // Test prospects
  const { count: testNow, error: e3 } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .contains('tags', ['test_ahora']);

  // Already contacted
  const { count: contacted, error: e4 } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'contactado');

  // Invalid
  const { count: invalid, error: e5 } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .contains('tags', ['invalido']);

  if (e1 || e2 || e3 || e4 || e5) {
    console.error('Error fetching data:', e1 || e2 || e3 || e4 || e5);
    return;
  }

  console.log(`Total Leads: ${total}`);
  console.log(`Ready (status=prospecto, tag=nuevo): ${ready}`);
  console.log(`Test (tag=test_ahora): ${testNow}`);
  console.log(`Contacted: ${contacted}`);
  console.log(`Invalid (tag=invalido): ${invalid}`);
  
  process.exit(0);
}

checkStatus();
