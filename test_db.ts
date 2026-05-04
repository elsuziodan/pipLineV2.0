import { supabase } from './apps/call-track/src/config/supabase.js';
async function test() {
  const { data } = await supabase.from('clients').select('id, phone').eq('phone', '+524777800840').single();
  console.log("With +:", data);
  const { data: d2 } = await supabase.from('clients').select('id, phone').eq('phone', '524777800840').single();
  console.log("Without +:", d2);
  const { data: d3 } = await supabase.from('clients').select('id, phone').eq('phone', ' 524777800840').single();
  console.log("With space:", d3);
  const { data: d4 } = await supabase.from('clients').select('id, phone').like('phone', '%524777800840%').single();
  console.log("With like:", d4);
}
test();
