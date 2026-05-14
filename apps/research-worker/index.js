require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SCRAPPER_DIR = path.join(__dirname, '../scrapper');
const SCRIPT_PATH = path.join(SCRAPPER_DIR, 'src/deep_research.py');
const PYTHON_PATH = path.join(SCRAPPER_DIR, 'venv/bin/python3'); // Fallback to absolute python3 if no venv
const OUTPUT_DIR = path.join(__dirname, 'temp_results');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

async function processJob(job) {
  const { id: jobId, client_id } = job;
  console.log(`[${new Date().toISOString()}] Processing job ${jobId} for client ${client_id}`);

  try {
    // 1. Update status to processing
    await supabase.from('research_jobs').update({ status: 'processing' }).eq('id', jobId);

    // 2. Get client data (listing_url)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('metadata')
      .eq('id', client_id)
      .single();

    if (clientError || !client) throw new Error("Client not found");

    const listingUrl = client.metadata?.listing_url;
    const websiteUrl = client.metadata?.website_url;

    if (!listingUrl) throw new Error("No listing_url in client metadata");

    // 3. Execute script
    const outputFile = path.join(OUTPUT_DIR, `${jobId}.json`);
    const python = fs.existsSync(PYTHON_PATH) ? PYTHON_PATH : '/usr/bin/python3';

    const args = [
      SCRIPT_PATH,
      '--listing-url', listingUrl,
      '--output', outputFile
    ];
    if (websiteUrl) {
      args.push('--website-url', websiteUrl);
    }

    console.log(`[${jobId}] Running: ${python} ${args.join(' ')}`);
    
    await execFileAsync(python, args, {
      cwd: SCRAPPER_DIR,
      timeout: 120000 // 2 minutes timeout
    });

    // 4. Read result
    if (!fs.existsSync(outputFile)) throw new Error("Result file not generated");
    const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

    // 5. Update client metadata
    const newMetadata = { ...client.metadata, deep_research: result };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client_id);

    // 6. Mark job as completed
    await supabase.from('research_jobs').update({
      status: 'completed',
      result: result
    }).eq('id', jobId);

    console.log(`[${jobId}] Success!`);
    
    // Cleanup
    fs.unlinkSync(outputFile);

  } catch (error) {
    console.error(`[${jobId}] Error:`, error.message);
    await supabase.from('research_jobs').update({
      status: 'error',
      error_message: error.message
    }).eq('id', jobId);
  }
}

async function startWorker() {
  console.log("Deep Research Worker started...");
  console.log("Listening for new jobs in 'research_jobs' table...");

  // Process existing pending jobs first
  const { data: pendingJobs } = await supabase
    .from('research_jobs')
    .select('*')
    .eq('status', 'pending');

  if (pendingJobs && pendingJobs.length > 0) {
    console.log(`Found ${pendingJobs.length} pending jobs. Processing...`);
    for (const job of pendingJobs) {
      await processJob(job);
    }
  }

  // Subscribe to new insertions
  supabase
    .channel('research_jobs_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'research_jobs', filter: 'status=eq.pending' },
      (payload) => {
        processJob(payload.new);
      }
    )
    .subscribe();
}

startWorker();
