import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
  getLectureGenAiClient,
  resolveLectureGeminiApiKey,
  setLectureApiCorsHeaders,
  verifyLectureApiAuth,
} from '../server/api/lectureApiRuntime.js';
import {
  BIOGRAPHY_TIMELINE_RESPONSE_JSON_SCHEMA,
  buildBiographyTimelinePrompt,
  buildTimelineDataFromBiographyPlan,
  fetchWikipediaPlainExtract,
  type BiographyImportRequest,
  type BiographyTimelinePlan,
  TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
  TIMELINE_BIOGRAPHY_MODELS,
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

function extractJsonText(rawText: string) {
  const trimmed = rawText.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed.replace(/```json\s*\n?|\n?```/g, '').trim();
  return candidate.startsWith('{') ? candidate : (candidate.match(/\{[\s\S]*\}/)?.[0] ?? candidate);
}

function validateRequestBody(body: unknown): BiographyImportRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required.');
  }

  const sourceUrl = typeof (body as BiographyImportRequest).sourceUrl === 'string'
    ? (body as BiographyImportRequest).sourceUrl.trim()
    : '';

  if (!sourceUrl) {
    throw new Error('Укажите ссылку на статью Wikipedia.');
  }

  return { sourceUrl };
}

async function generateBiographyPlan(prompt: string, apiKey: string) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseJsonSchema: BIOGRAPHY_TIMELINE_RESPONSE_JSON_SCHEMA,
        },
      });

      return {
        model,
        plan: JSON.parse(extractJsonText(result.text || '')) as BiographyTimelinePlan,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini generation failed');
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

  try {
    initFirebaseAdmin();

    const authResult = await verifyLectureApiAuth(req);
    if (!authResult.valid) {
      res.status(401).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }

    const { sourceUrl } = validateRequestBody(req.body);
    const wikiPage = await fetchWikipediaPlainExtract(sourceUrl);
    const apiKey = resolveLectureGeminiApiKey(req);
    const prompt = buildBiographyTimelinePrompt({
      articleTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      extract: wikiPage.extract,
    });

    const { model, plan } = await generateBiographyPlan(prompt, apiKey);
    const timeline = buildTimelineDataFromBiographyPlan(plan);

    res.status(200).json({
      ok: true,
      canvasName: plan.canvasName || plan.subjectName || wikiPage.title,
      subjectName: plan.subjectName || wikiPage.title,
      timeline,
      meta: {
        model,
        sourceTitle: wikiPage.title,
        sourceUrl: wikiPage.canonicalUrl,
        extractChars: wikiPage.extract.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось собрать таймлайн по биографии.';
    const statusCode =
      /Wikipedia|статью|ссылк|Request body/i.test(message) ? 400 :
      /UNAUTHORIZED|авториза/i.test(message) ? 401 :
      500;

    res.status(statusCode).json({
      ok: false,
      error:
        statusCode === 500
          ? 'Не удалось собрать таймлайн по биографии. Попробуйте ещё раз позже.'
          : message,
    });
  }
}
