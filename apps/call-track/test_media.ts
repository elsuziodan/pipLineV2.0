import { supabaseAdmin } from './src/config/supabase.js';

async function test() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const chatMediaBucket = buckets?.find(b => b.name === 'chat-media');
  console.log("Bucket config:", JSON.stringify(chatMediaBucket, null, 2));
}
test();
