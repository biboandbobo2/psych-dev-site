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

function stripJsonTrailingCommas(value: string) {
  return value.replace(/,\s*([}\]])/g, '$1');
}

function collectGeminiResultText(result: unknown) {
  if (result && typeof result === 'object') {
    const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
    if (directText.trim()) {
      return directText;
    }

    const candidateText = 'candidates' in result && Array.isArray(result.candidates)
      ? result.candidates
          .flatMap((candidate) => {
            if (!candidate || typeof candidate !== 'object') return [];
            const content = 'content' in candidate ? candidate.content : null;
            if (!content || typeof content !== 'object') return [];
            const parts = 'parts' in content && Array.isArray(content.parts) ? content.parts : [];
            return parts
              .map((part) => {
                if (!part || typeof part !== 'object') return '';
                return 'text' in part && typeof part.text === 'string' ? part.text : '';
              })
              .filter(Boolean);
          })
          .join('\n')
      : '';

    if (candidateText.trim()) {
      return candidateText;
    }
  }

  return '';
}

function parseBiographyPlanResult(result: unknown): BiographyTimelinePlan {
  const rawText = collectGeminiResultText(result);
  const extractedJson = extractJsonText(rawText);
  const candidates = [extractedJson, stripJsonTrailingCommas(extractedJson), rawText, stripJsonTrailingCommas(rawText)]
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as BiographyTimelinePlan;
    } catch {
      // try next candidate
    }
  }

  throw new Error('Gemini JSON parse failed');
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

function normalizeBiographyApiError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : 'Не удалось собрать таймлайн по биографии.';

  if (/Request body|Wikipedia|статью|ссылк/i.test(rawMessage)) {
    return { statusCode: 400, message: rawMessage };
  }

  if (/UNAUTHORIZED|авториза/i.test(rawMessage)) {
    return { statusCode: 401, message: rawMessage };
  }

  if (/GEMINI_API_KEY not configured/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: 'Gemini API key не настроен на сервере preview. Добавьте свой ключ в профиль или настройте env для Vercel.',
    };
  }

  if (/quota|RESOURCE_EXHAUSTED|429/i.test(rawMessage)) {
    return {
      statusCode: 429,
      message: 'Gemini временно недоступен из-за лимита запросов или квоты. Попробуйте позже или используйте другой API key.',
    };
  }

  if (/PERMISSION_DENIED|API key not valid|invalid api key|forbidden/i.test(rawMessage)) {
    return {
      statusCode: 403,
      message: 'Gemini API key недействителен или не имеет доступа к этой модели.',
    };
  }

  if (/model|unsupported|not found/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: 'Gemini модель для импорта биографии сейчас недоступна. Попробуйте позже или используйте другой API key.',
    };
  }

  if (/JSON|Unexpected token|schema|parse/i.test(rawMessage)) {
    return {
      statusCode: 502,
      message: 'Gemini вернул некорректный ответ при сборке таймлайна. Попробуйте ещё раз.',
    };
  }

  return {
    statusCode: 500,
    message: 'Не удалось собрать таймлайн по биографии. Попробуйте ещё раз позже.',
  };
}

async function generateBiographyPlan(prompt: string, apiKey: string) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const structuredResult = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseJsonSchema: BIOGRAPHY_TIMELINE_RESPONSE_JSON_SCHEMA,
        },
      });

      return { model, plan: parseBiographyPlanResult(structuredResult) };
    } catch (error) {
      lastError = error;

      try {
        const relaxedResult = await client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    `${prompt}\n\n` +
                    'Верни только один JSON-объект без markdown и без пояснений. ' +
                    'Даже если не уверен в части полей, соблюдай JSON-структуру и обязательно верни mainEvents и branches как массивы.',
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
            responseMimeType: 'text/plain',
          },
        });

        return { model, plan: parseBiographyPlanResult(relaxedResult) };
      } catch (relaxedError) {
        lastError = relaxedError;
      }
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
    const { statusCode, message } = normalizeBiographyApiError(error);

    res.status(statusCode).json({
      ok: false,
      error: message,
    });
  }
}
