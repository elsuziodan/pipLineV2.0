import { supabaseAdmin } from './src/config/supabase.js';

async function updateBucket() {
  console.log("Updating bucket config to allow videos...");
  const { data, error } = await supabaseAdmin.storage.updateBucket('chat-media', {
    public: true,
    allowedMimeTypes: ['image/*', 'audio/*', 'video/*'],
    fileSizeLimit: 52428800 // 50MB
  });
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Bucket updated.");
  }
}
updateBucket();
