import { supabase } from '../src/config/supabase.js';

async function check() {
  const { data: clients } = await supabase
    .from('clients')
    .select('name, phone');
  
  if (!clients || clients.length === 0) {
    console.log("No clients found.");
    return;
  }
  
  for (const client of clients) {
    console.log(`- ${client.name} (${client.phone})`);
  }
}
check();
