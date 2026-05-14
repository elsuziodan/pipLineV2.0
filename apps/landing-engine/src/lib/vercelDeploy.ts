interface DeployResult {
  url: string;
  readyState: string;
  id: string;
}

/**
 * Deploya un archivo HTML estático a Vercel usando la Deployments API.
 */
export async function deployToVercel(html: string, slug: string): Promise<DeployResult> {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN no configurado en .env.local');
  }

  // Convertir HTML a base64
  const htmlBase64 = Buffer.from(html).toString('base64');

  const response = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer \${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: slug,
      files: [
        {
          file: 'index.html',
          data: htmlBase64,
          encoding: 'base64',
        },
      ],
      projectSettings: {
        framework: null,
      },
      target: 'production',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Vercel deploy failed: \${errorData?.error?.message || response.statusText}`);
  }

  const result = await response.json();
  
  return {
    url: `https://\${result.url}`,
    readyState: result.readyState,
    id: result.id,
  };
}
