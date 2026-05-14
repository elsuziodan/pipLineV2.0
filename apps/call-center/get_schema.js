const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="(.*?)"/)[1];

async function run() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const json = await res.json();
  console.log("Tables:", Object.keys(json.definitions || {}));
}
run();
