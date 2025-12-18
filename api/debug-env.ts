/* Temporary debug endpoint - DELETE AFTER TESTING */
export default function handler(_req: any, res: any) {
  const hasKey = !!process.env.GEMINI_API_KEY;
  const keyLength = process.env.GEMINI_API_KEY?.length ?? 0;
  const keyPrefix = process.env.GEMINI_API_KEY?.slice(0, 8) ?? 'none';

  // List all env var names (not values!)
  const allEnvVarNames = Object.keys(process.env).sort();
  const geminiVars = allEnvVarNames.filter(k => k.includes('GEMINI') || k.includes('GOOGLE') || k.includes('API_KEY'));

  // Check for common Vercel env vars to verify env vars work at all
  const vercelVars = allEnvVarNames.filter(k => k.startsWith('VERCEL'));
  const viteVars = allEnvVarNames.filter(k => k.startsWith('VITE'));

  res.status(200).json({
    hasGeminiKey: hasKey,
    keyLength,
    keyPrefix: hasKey ? keyPrefix + '...' : 'none',
    geminiEnvVars: geminiVars,
    vercelEnvVars: vercelVars,
    viteEnvVars: viteVars,
    totalEnvVars: allEnvVarNames.length,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
