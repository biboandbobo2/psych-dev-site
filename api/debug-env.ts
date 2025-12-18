/* Temporary debug endpoint - DELETE AFTER TESTING */
export default function handler(_req: any, res: any) {
  const hasKey = !!process.env.GEMINI_API_KEY;
  const keyLength = process.env.GEMINI_API_KEY?.length ?? 0;
  const keyPrefix = process.env.GEMINI_API_KEY?.slice(0, 8) ?? 'none';

  // List all env var names (not values!) that start with GEMINI
  const geminiVars = Object.keys(process.env).filter(k => k.includes('GEMINI'));

  res.status(200).json({
    hasGeminiKey: hasKey,
    keyLength,
    keyPrefix: hasKey ? keyPrefix + '...' : 'none',
    geminiEnvVars: geminiVars,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
