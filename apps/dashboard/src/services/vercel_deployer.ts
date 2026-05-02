import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execPromise = util.promisify(exec);

export async function deployLandingPage(clientName: string, siteConfig: any) {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is missing");

  const slug = clientName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9]+/g, "-") 
    .replace(/(^-|-$)+/g, ""); 
    
  const projectName = `landing-${slug}`;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-deploy-'));

  try {
    // 1. Create the project via REST API (Without GitHub link to avoid integration errors)
    let projectId = "";
    let orgId = "";
    
    // Check if project exists first
    const checkRes = await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (checkRes.ok) {
      const existingProject = await checkRes.json();
      projectId = existingProject.id;
      orgId = existingProject.accountId;
    } else {
      // Create new project
      const createRes = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          framework: 'nextjs'
        })
      });
      
      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(`Failed to create Vercel project: ${errorData.error?.message || createRes.statusText}`);
      }
      
      const newProject = await createRes.json();
      projectId = newProject.id;
      orgId = newProject.accountId;
    }

    // Disable SSO/deployment protection so landing pages are publicly accessible
    await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ssoProtection: null, passwordProtection: null })
    });

    // 2. Clone template locally
    console.log(`[Deployer] Cloning template to ${tmpDir}...`);
    await execPromise(`git clone https://github.com/elsuziodan/7f-landing-template.git .`, { cwd: tmpDir });
    
    // 3. Inject config & npmrc bypass
    console.log(`[Deployer] Setting up environment variables...`);
    // Write config as a separate JSON file instead of .env to avoid quoting issues
    const configJson = JSON.stringify(siteConfig);
    fs.writeFileSync(path.join(tmpDir, 'src', 'data', 'siteConfig.json'), configJson);
    // Also write .env.production for any env-based fallback
    fs.writeFileSync(path.join(tmpDir, '.env.production'), `NEXT_PUBLIC_SITE_CONFIG=${configJson}`);
    
    console.log(`[Deployer] Injecting .npmrc to bypass peer dependency conflicts...`);
    fs.writeFileSync(path.join(tmpDir, '.npmrc'), 'legacy-peer-deps=true\n');

    // 4. Deploy via CLI using Project ID to completely bypass all interactive prompts
    console.log(`[Deployer] Starting Vercel CLI deployment for ${projectName}...`);
    const deployCmd = `npx vercel --prod --yes --token ${token}`;
    const execOptions = { 
      cwd: tmpDir,
      timeout: 300000, // 5 minutes max
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for build output
      env: { 
        ...process.env, 
        VERCEL_ORG_ID: orgId,
        VERCEL_PROJECT_ID: projectId
      }
    };

    // Helper: extract production URL from Vercel CLI output
    const extractUrl = (text: string): string | null => {
      const match = text.match(/Production:\s*(https:\/\/[^\s\[\]]+)/);
      return match ? match[1] : null;
    };

    try {
      const { stdout, stderr } = await execPromise(deployCmd, execOptions);
      console.log(`[Deployer] Vercel Output:`, stdout);
      if (stderr) console.error(`[Deployer] Vercel Stderr:`, stderr);

      const url = extractUrl(stdout) || extractUrl(stderr);
      return url || `https://${projectName}.vercel.app`;

    } catch (execError: any) {
      // Vercel CLI may exit non-zero due to build warnings but still deploy successfully.
      // Check if the output contains a Production URL before treating it as a real failure.
      const combinedOutput = `${execError.stdout || ''} ${execError.stderr || ''} ${execError.message || ''}`;
      const url = extractUrl(combinedOutput);
      
      if (url) {
        console.log(`[Deployer] Deploy succeeded despite non-zero exit. URL: ${url}`);
        return url;
      }

      // Real failure - no production URL found
      console.error("Vercel Deploy Error:", execError);
      const safeErrorMsg = (execError.message || "").replace(token!, "***");
      throw new Error(safeErrorMsg);
    }
    
  } catch (error: any) {
    console.error("Pipeline Error:", error);
    const safeErrorMsg = (error.message || "").replace(process.env.VERCEL_API_TOKEN || '', "***");
    throw new Error(safeErrorMsg);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
