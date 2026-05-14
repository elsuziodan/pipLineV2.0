import { supabase } from '../src/config/supabase.js';
import { getHistoryPaginated } from '../src/config/conversations.js';

async function check() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', '%moderno%');
    
  if (!clients || clients.length === 0) {
    console.log("No client found with 'moderno'");
    return;
  }
  
  for (const client of clients) {
    console.log("-------------------");
    console.log("Client:", client.name, client.phone);
    const history = await getHistoryPaginated(client.phone, 10);
    console.log("Recent history:", JSON.stringify(history, null, 2));
  }
}
check();
