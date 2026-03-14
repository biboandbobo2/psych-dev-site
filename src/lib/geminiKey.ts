export function sanitizeGeminiApiKey(key: string | null | undefined): string | undefined {
  if (typeof key !== 'string') {
    return undefined;
  }

  const normalized = key.replace(/\s+/g, '').trim();
  return normalized || undefined;
}

export function buildGeminiApiKeyHeader(key: string | null | undefined): Record<string, string> {
  const sanitizedKey = sanitizeGeminiApiKey(key);
  return sanitizedKey ? { 'X-Gemini-Api-Key': sanitizedKey } : {};
}
