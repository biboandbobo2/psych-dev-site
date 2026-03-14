export function sanitizeGeminiApiKey(key: string | null | undefined): string | undefined {
  if (typeof key !== 'string') {
    return undefined;
  }

  const normalized = key
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\s"'`]/g, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .trim();
  return normalized || undefined;
}

export function buildGeminiApiKeyHeader(key: string | null | undefined): Record<string, string> {
  const sanitizedKey = sanitizeGeminiApiKey(key);
  return sanitizedKey ? { 'X-Gemini-Api-Key': sanitizedKey } : {};
}
