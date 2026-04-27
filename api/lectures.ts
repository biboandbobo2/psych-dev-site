/**
 * GET/POST /api/lectures
 * Lecture transcript Q&A endpoint.
 * Actions: list (GET), search (POST), answer (POST).
 *
 * Helpers вынесены в api/lib/lectureRetrieval.ts (типы, validation, vector
 * retrieval pipeline) и api/lib/lectureAnswer.ts (prompt + cleanup).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from 'firebase-admin/firestore';
import {
  getLectureGenAiClient,
  resolveLectureGeminiApiKey,
  setLectureApiCorsHeaders,
  toSafeLectureApiError,
  tryParseLectureGeminiJson,
  verifyLectureApiAuth,
} from './lib/lectureApiRuntime.js';
import { loadFallbackLectureSources } from './lib/lectureFallback.js';
import { groupLectureSourcesByCourse } from './lib/lectureCourseConfig.js';
import {
  initFirebaseAdmin,
  recordByokUsage,
} from '../src/lib/api-server/sharedApiRuntime.js';
import {
  LECTURE_COLLECTIONS,
  buildLectureDeepLink,
  retrieveLectureMatches,
  sortLectureCitations,
  validateLectureScope,
  type LectureSearchMatch,
  type LectureSourceRecord,
} from './lib/lectureRetrieval.js';
import {
  LECTURE_SYSTEM_PROMPT,
  buildLectureAiUnavailableMessage,
  buildLectureContext,
  sanitizeLectureAnswer,
} from './lib/lectureAnswer.js';

// Re-exports для совместимости с tests/api/lectures.test.ts и других потребителей.
export {
  LECTURE_COLLECTIONS,
  LECTURE_SEARCH_CONFIG,
  buildLectureDeepLink,
  validateLectureScope,
} from './lib/lectureRetrieval.js';
export { buildLectureAiUnavailableMessage } from './lib/lectureAnswer.js';
export {
  getLectureApiAllowedOrigin,
  tryParseLectureGeminiJson,
} from './lib/lectureApiRuntime.js';
export { groupLectureSourcesByCourse } from './lib/lectureCourseConfig.js';
export { computeLexicalScore } from './lib/lectureFallback.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = setLectureApiCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    if (req.headers.origin && !allowedOrigin) {
      res.status(403).json({ ok: false, error: 'Origin not allowed' });
      return;
    }
    res.status(200).end();
    return;
  }

  try {
    initFirebaseAdmin();
    const db = getFirestore();
    const action = (req.query.action as string) || (req.body?.action as string) || '';
    const authResult = await verifyLectureApiAuth(req);

    if (!authResult.valid) {
      res.status(401).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }

    if (action === 'list' && req.method === 'GET') {
      const snapshot = await db
        .collection(LECTURE_COLLECTIONS.sources)
        .where('active', '==', true)
        .get();

      const sources = snapshot.empty
        ? await loadFallbackLectureSources(db)
        : snapshot.docs.map((doc) => doc.data() as LectureSourceRecord);
      res.status(200).json({
        ok: true,
        courses: groupLectureSourcesByCourse(sources),
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const validation = validateLectureScope(req.body);
    if (validation.valid === false) {
      res.status(400).json({ ok: false, error: validation.error, code: validation.code });
      return;
    }

    if (action === 'search') {
      const apiKey = resolveLectureGeminiApiKey(req);
      if (!apiKey) {
        res.status(402).json({
          ok: false,
          error: 'Подключите свой Gemini API ключ в профиле — он бесплатный.',
          code: 'BYOK_REQUIRED',
        });
        return;
      }
      const startedAt = Date.now();
      const { matches, sources } = await retrieveLectureMatches(
        db,
        validation.value,
        'hybrid',
        apiKey,
      );

      void recordByokUsage({
        uid: authResult.uid,
        action: 'lectures:search',
        tokens: Math.ceil(validation.value.query.length / 4),
        firestore: db,
      });

      const results = matches.map((match) => ({
        chunkId: match.id,
        lectureKey: match.lectureKey,
        courseId: match.courseId,
        periodId: match.periodId,
        periodTitle: match.periodTitle,
        lectureTitle: match.lectureTitle,
        youtubeVideoId: match.youtubeVideoId,
        startMs: match.startMs,
        endMs: match.endMs,
        timestampLabel: match.timestampLabel,
        excerpt: match.text,
        score: Math.round(match.score * 100) / 100,
        path: buildLectureDeepLink(
          match.courseId,
          match.periodId,
          match.youtubeVideoId,
          match.startMs,
        ),
      }));

      res.status(200).json({
        ok: true,
        lectures: sources,
        results,
        tookMs: Date.now() - startedAt,
      });
      return;
    }

    if (action === 'answer') {
      const apiKey = resolveLectureGeminiApiKey(req);
      if (!apiKey) {
        res.status(402).json({
          ok: false,
          error: 'Подключите свой Gemini API ключ в профиле — он бесплатный.',
          code: 'BYOK_REQUIRED',
        });
        return;
      }
      const startedAt = Date.now();
      const { matches, sources } = await retrieveLectureMatches(
        db,
        validation.value,
        'vector-only',
        apiKey,
      );

      if (!sources.length) {
        res.status(200).json({
          ok: true,
          answer: buildLectureAiUnavailableMessage(),
          citations: [],
          tookMs: Date.now() - startedAt,
        });
        return;
      }

      if (!matches.length) {
        res.status(200).json({
          ok: true,
          answer:
            'В выбранных лекциях не нашлось релевантных фрагментов для ответа на этот вопрос.',
          citations: [],
          tookMs: Date.now() - startedAt,
        });
        return;
      }

      const prompt = `${LECTURE_SYSTEM_PROMPT}

ИСТОЧНИКИ:
${matches.map(buildLectureContext).join('\n\n')}

ВОПРОС: ${validation.value.query}`;

      const client = getLectureGenAiClient(apiKey);
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 4000, temperature: 0.3 },
      });

      void recordByokUsage({
        uid: authResult.uid,
        action: 'lectures:answer',
        tokens: result.usageMetadata?.totalTokenCount ?? 0,
        firestore: db,
      });

      const rawText = result.text || '';
      const parsed = tryParseLectureGeminiJson(rawText) ?? {
        answer:
          rawText || 'Не удалось сгенерировать ответ. Попробуйте переформулировать вопрос.',
        citations: [],
      };

      const chunkMap = new Map<string, LectureSearchMatch>(
        matches.map((match) => [match.id, match]),
      );
      const citations = sortLectureCitations(
        (parsed.citations || [])
          .filter((citation) => chunkMap.has(citation.chunkId))
          .map((citation) => {
            const match = chunkMap.get(citation.chunkId)!;
            return {
              chunkId: citation.chunkId,
              lectureKey: match.lectureKey,
              lectureTitle: match.lectureTitle,
              courseId: match.courseId,
              periodId: match.periodId,
              periodTitle: match.periodTitle,
              youtubeVideoId: match.youtubeVideoId,
              startMs: match.startMs,
              timestampLabel: match.timestampLabel,
              excerpt: match.text,
              claim: citation.claim || '',
              path: buildLectureDeepLink(
                match.courseId,
                match.periodId,
                match.youtubeVideoId,
                match.startMs,
              ),
            };
          }),
      );

      res.status(200).json({
        ok: true,
        answer: sanitizeLectureAnswer(parsed.answer || ''),
        citations,
        tookMs: Date.now() - startedAt,
      });
      return;
    }

    res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch {
    res.status(500).json({ ok: false, error: toSafeLectureApiError() });
  }
}
