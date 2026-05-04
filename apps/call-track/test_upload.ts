import { supabase } from './src/config/supabase.js';
async function test() {
  const { data, error } = await supabase.storage.from('chat-media').upload('test.txt', 'hello world', { upsert: true });
  console.log("Upload result:", data, error);
}
test();
