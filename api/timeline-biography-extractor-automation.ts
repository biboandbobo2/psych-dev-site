import type { VercelRequest, VercelResponse } from '@vercel/node';
import { debugError } from '../src/lib/debug.js';
import { setLectureApiCorsHeaders } from '../server/api/lectureApiRuntime.js';
import {
  normalizeBiographyApiError,
  resolveRequiredGeminiApiKey,
  runBiographyFactExtraction,
  validateBiographyImportRequest,
} from '../server/api/timelineBiography.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setLectureApiCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { sourceUrl, extractionMode } = validateBiographyImportRequest(req.body);
    const apiKey = resolveRequiredGeminiApiKey(req);
    const payload = await runBiographyFactExtraction({
      sourceUrl,
      apiKey,
      extractionMode,
    });

    res.status(200).json(payload);
  } catch (error) {
    debugError('[timeline-biography-extractor-automation] handler error', error);
    const { statusCode, message } = normalizeBiographyApiError(error);

    res.status(statusCode).json({
      ok: false,
      error: message,
    });
  }
}
