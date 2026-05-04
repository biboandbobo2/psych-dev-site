/**
 * Generic Gemini / Firestore helpers shared by all biographyImport pipeline
 * steps. Extracted from biographyImport.ts to keep the orchestrator focused
 * on the 6-step flow rather than transport mechanics.
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import { logger } from 'firebase-functions/v2';

export function getGenAiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

/** Call Gemini with retry on 429 (rate limit) — up to 3 attempts with 60s delay */
export async function callGeminiWithRetry(
  client: GoogleGenAI,
  params: {
    model: string;
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    config: Record<string, unknown>;
  },
  label: string
): Promise<unknown> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 60_000; // 60s — free tier resets per-minute quota
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const callStart = Date.now();
      const result = await client.models.generateContent(params);
      const callDurationMs = Date.now() - callStart;
      logger.info(
        `[biographyImport] ${label}: Gemini call took ${(callDurationMs / 1000).toFixed(1)}s (attempt ${attempt + 1})`
      );
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const is429 = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
      if (is429 && attempt < MAX_RETRIES - 1) {
        logger.info(
          `[biographyImport] ${label}: 429 rate limit, retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label}: max retries exceeded`);
}

/** Извлекает totalTokenCount из usageMetadata Gemini response (для BYOK accounting). */
export function extractGeminiTokens(result: unknown): number {
  if (!result || typeof result !== 'object' || !('usageMetadata' in result)) return 0;
  const meta = (result as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
  return typeof meta?.totalTokenCount === 'number' ? meta.totalTokenCount : 0;
}

/**
 * Дублирует логику recordByokUsage из src/lib/api-server/sharedApiRuntime.ts.
 * Cross-folder import из functions/ в src/ нежелателен (разные tsconfig moduleResolution),
 * поэтому helper тут локальный. Action `biography:import` чтобы был отдельный счётчик
 * наряду с lectures:*, books:*, assistant в /profile.
 */
export async function recordBiographyByokUsage(uid: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  try {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const docId = `${uid}_${day}`;
    const ref = getFirestore().collection('aiUsageDaily').doc(docId);
    await ref.set(
      {
        uid,
        day,
        tokens: FieldValue.increment(tokens),
        requests: FieldValue.increment(1),
        'byAction.biography:import.tokens': FieldValue.increment(tokens),
        'byAction.biography:import.requests': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    logger.error('[biographyImport] recordByokUsage failed', err);
  }
}

export function collectGeminiResultText(result: unknown) {
  if (result && typeof result === 'object') {
    const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
    if (directText.trim()) return directText;

    const outputsText =
      'outputs' in result && Array.isArray(result.outputs)
        ? result.outputs
            .map((output: Record<string, unknown>) => {
              if (!output || typeof output !== 'object') return '';
              const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
              if (type !== 'text') return '';
              return 'text' in output && typeof output.text === 'string' ? output.text : '';
            })
            .filter(Boolean)
            .join('\n')
        : '';
    if (outputsText.trim()) return outputsText;

    const candidateText =
      'candidates' in result && Array.isArray(result.candidates)
        ? result.candidates
            .flatMap((candidate: Record<string, unknown>) => {
              if (!candidate || typeof candidate !== 'object') return [];
              const content = 'content' in candidate ? candidate.content : null;
              if (!content || typeof content !== 'object') return [];
              const parts =
                'parts' in (content as Record<string, unknown>) &&
                Array.isArray((content as Record<string, unknown>).parts)
                  ? ((content as Record<string, unknown>).parts as Array<Record<string, unknown>>)
                  : [];
              return parts
                .map((part) => {
                  if (!part || typeof part !== 'object') return '';
                  return 'text' in part && typeof part.text === 'string' ? part.text : '';
                })
                .filter(Boolean);
            })
            .join('\n')
        : '';
    if (candidateText.trim()) return candidateText;
  }
  return '';
}
