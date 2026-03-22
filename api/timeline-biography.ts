import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { debugError } from '../src/lib/debug.js';
import { resolveLectureGeminiApiKey, setLectureApiCorsHeaders, verifyLectureApiAuth } from '../server/api/lectureApiRuntime.js';
import {
  normalizeBiographyApiError,
  runBiographyImport,
  validateBiographyImportRequest,
} from '../server/api/timelineBiography.js';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  }

  const sa = JSON.parse(json);
  initializeApp({
    credential: cert(sa),
  });
}

function sendNdjson(res: VercelResponse, data: unknown) {
  res.write(JSON.stringify(data) + '\n');
}

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

  const wantStream = req.headers['x-stream-progress'] === 'true';

  try {
    initFirebaseAdmin();

    const authResult = await verifyLectureApiAuth(req);
    if (!authResult.valid) {
      res.status(401).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }

    const { sourceUrl } = validateBiographyImportRequest(req.body);
    const apiKey = resolveLectureGeminiApiKey(req);

    if (wantStream) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200);

      const payload = await runBiographyImport({
        sourceUrl,
        apiKey,
        onProgress: (step, total, label, detail) => {
          sendNdjson(res, { type: 'progress', step, total, label, detail });
        },
      });

      sendNdjson(res, { type: 'result', data: payload });
      res.end();
    } else {
      const payload = await runBiographyImport({ sourceUrl, apiKey });
      res.status(200).json(payload);
    }
  } catch (error) {
    debugError('[timeline-biography] handler error', error);
    const { statusCode, message } = normalizeBiographyApiError(error);
    const rawMessage = error instanceof Error ? error.message : String(error);

    if (wantStream) {
      sendNdjson(res, {
        type: 'error',
        message,
        detail: rawMessage,
        stack: error instanceof Error ? error.stack : undefined,
        sourceUrl: req.body?.sourceUrl,
      });
      res.end();
    } else {
      res.status(statusCode).json({ ok: false, error: message });
    }
  }
}
