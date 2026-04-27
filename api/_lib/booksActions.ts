// Action handlers для /api/books: search и answer (BYOK + auth required).
// LIST/SNIPPET остаются inline в books.ts — они короткие.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import {
  recordByokUsage,
  requireBYOKGeminiKey,
  verifyAuthBearer,
} from '../../src/lib/api-server/sharedApiRuntime.js';
import {
  BOOK_COLLECTIONS,
  BOOK_SEARCH_CONFIG,
  buildGenAI,
  cleanupAnswerText,
  computeLexicalScore,
  embedQuery,
  SYSTEM_PROMPT,
} from './booksHelpers.js';

interface SearchChunk {
  id: string;
  bookId: string;
  pageStart: number;
  pageEnd: number;
  preview: string;
  vectorScore: number;
}

/**
 * SEARCH action: BYOK auth + vector search в выбранных книгах с rerank
 * по vector + lexical score (0.7 / 0.3). Возвращает топ contextK chunks
 * с превью и (округлённым до 0.01) объединённым score.
 */
export async function handleBooksSearchAction(
  req: VercelRequest,
  res: VercelResponse,
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const auth = await verifyAuthBearer(req);
  if (auth.valid !== true) {
    res.status(401).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }
  const userKey = requireBYOKGeminiKey(req);
  if (!userKey) {
    res.status(402).json({
      ok: false,
      error: 'Подключите свой Gemini API ключ в профиле — он бесплатный.',
      code: 'BYOK_REQUIRED',
    });
    return;
  }

  const startTime = Date.now();
  const body = req.body as Record<string, unknown>;

  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  const bookIds = Array.isArray(body?.bookIds) ? (body.bookIds as string[]) : [];

  if (query.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
    res.status(400).json({ ok: false, error: 'Query too short', code: 'VALIDATION_ERROR' });
    return;
  }

  if (
    bookIds.length < BOOK_SEARCH_CONFIG.minBooksPerSearch ||
    bookIds.length > BOOK_SEARCH_CONFIG.maxBooksPerSearch
  ) {
    res.status(400).json({ ok: false, error: 'Invalid bookIds', code: 'VALIDATION_ERROR' });
    return;
  }

  const booksSnapshot = await db
    .collection(BOOK_COLLECTIONS.books)
    .where('__name__', 'in', bookIds)
    .get();

  const bookTitles = new Map<string, string>();
  booksSnapshot.docs.forEach((doc) => {
    bookTitles.set(doc.id, doc.data().title || 'Untitled');
  });

  const queryEmbedding = await embedQuery(query, userKey);
  const allResults: SearchChunk[] = [];

  for (const bookId of bookIds) {
    try {
      const chunksQuery = db
        .collection(BOOK_COLLECTIONS.chunks)
        .where('bookId', '==', bookId)
        .findNearest('embedding', FieldValue.vector(queryEmbedding), {
          limit: Math.ceil(BOOK_SEARCH_CONFIG.candidateK / bookIds.length),
          distanceMeasure: 'COSINE',
        });

      const snapshot = await chunksQuery.get();
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const vectorScore = 1 - (index / snapshot.docs.length) * 0.5;
        allResults.push({
          id: doc.id,
          bookId: data.bookId,
          pageStart: data.pageStart || 1,
          pageEnd: data.pageEnd || 1,
          preview: data.preview || '',
          vectorScore,
        });
      });
    } catch {
      /* per-book failure tolerated */
    }
  }

  const reranked = allResults.map((result) => ({
    ...result,
    score: result.vectorScore * 0.7 + computeLexicalScore(query, result.preview) * 0.3,
  }));

  reranked.sort((a, b) => b.score - a.score);
  const topResults = reranked.slice(0, BOOK_SEARCH_CONFIG.contextK);

  const results = topResults.map((r) => ({
    id: r.id,
    bookId: r.bookId,
    bookTitle: bookTitles.get(r.bookId) || 'Untitled',
    pageStart: r.pageStart,
    pageEnd: r.pageEnd,
    preview: r.preview,
    score: Math.round(r.score * 100) / 100,
  }));

  const tookMs = Date.now() - startTime;
  // Embedding: usageMetadata из embedContent не возвращает токены, используем
  // приближение по длине запроса. Search — маленький вклад; точные числа в answer.
  void recordByokUsage({
    uid: auth.uid,
    action: 'books:search',
    tokens: Math.ceil(query.length / 4),
    firestore: db,
  });
  res.status(200).json({ ok: true, results, tookMs });
}

/**
 * ANSWER action: BYOK auth + vector retrieval + Gemini generation с
 * SYSTEM_PROMPT, парсинг JSON ответа (с fallback на raw text), cleanup
 * markdown/source-references и обрезка по параграфам.
 */
export async function handleBooksAnswerAction(
  req: VercelRequest,
  res: VercelResponse,
  db: FirebaseFirestore.Firestore,
): Promise<void> {
  const auth = await verifyAuthBearer(req);
  if (auth.valid !== true) {
    res.status(401).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }
  const userKey = requireBYOKGeminiKey(req);
  if (!userKey) {
    res.status(402).json({
      ok: false,
      error: 'Подключите свой Gemini API ключ в профиле — он бесплатный.',
      code: 'BYOK_REQUIRED',
    });
    return;
  }

  const startTime = Date.now();
  const body = req.body as Record<string, unknown>;

  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  const bookIds = Array.isArray(body?.bookIds) ? (body.bookIds as string[]) : [];

  if (query.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
    res.status(400).json({ ok: false, error: 'Query too short', code: 'VALIDATION_ERROR' });
    return;
  }

  if (bookIds.length === 0 || bookIds.length > BOOK_SEARCH_CONFIG.maxBooksPerSearch) {
    res.status(400).json({ ok: false, error: 'Invalid bookIds', code: 'VALIDATION_ERROR' });
    return;
  }

  const booksSnapshot = await db
    .collection(BOOK_COLLECTIONS.books)
    .where('__name__', 'in', bookIds)
    .get();

  const bookTitles = new Map<string, string>();
  booksSnapshot.docs.forEach((doc) => {
    bookTitles.set(doc.id, doc.data().title || 'Untitled');
  });

  const queryEmbedding = await embedQuery(query, userKey);
  const allChunks: Array<{
    id: string;
    bookId: string;
    pageStart: number;
    pageEnd: number;
    preview: string;
  }> = [];

  for (const bookId of bookIds) {
    try {
      const chunksQuery = db
        .collection(BOOK_COLLECTIONS.chunks)
        .where('bookId', '==', bookId)
        .findNearest('embedding', FieldValue.vector(queryEmbedding), {
          limit: Math.ceil(BOOK_SEARCH_CONFIG.contextK / bookIds.length) + 2,
          distanceMeasure: 'COSINE',
        });

      const snapshot = await chunksQuery.get();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        allChunks.push({
          id: doc.id,
          bookId: data.bookId,
          pageStart: data.pageStart || 1,
          pageEnd: data.pageEnd || 1,
          preview: data.preview || '',
        });
      });
    } catch {
      /* per-book failure tolerated */
    }
  }

  const topChunks = allChunks.slice(0, BOOK_SEARCH_CONFIG.contextK);

  if (topChunks.length === 0) {
    res.status(200).json({
      ok: true,
      answer:
        'К сожалению, в выбранных книгах не найдено релевантной информации по вашему вопросу.',
      citations: [],
      tookMs: Date.now() - startTime,
    });
    return;
  }

  const context = topChunks
    .map((chunk) => {
      const bookTitle = bookTitles.get(chunk.bookId) || 'Untitled';
      return `[SOURCE chunkId="${chunk.id}" book="${bookTitle}" pages="${chunk.pageStart}-${chunk.pageEnd}"]
${chunk.preview}
[/SOURCE]`;
    })
    .join('\n\n');

  const client = buildGenAI(userKey);
  const prompt = `${SYSTEM_PROMPT}

ИСТОЧНИКИ:
${context}

ВОПРОС: ${query}`;

  let geminiResponse: { answer: string; citations: Array<{ chunkId: string; claim: string }> };
  let rawText = '';
  let totalTokenCount = 0;

  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 4000 },
    });

    rawText = result.text || '';
    totalTokenCount = result.usageMetadata?.totalTokenCount ?? 0;
    let jsonText = rawText.trim();

    const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else {
      jsonText = jsonText.replace(/```json\s*\n?|\n?```/g, '').trim();
    }

    if (!jsonText.startsWith('{')) {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];
    }

    geminiResponse = JSON.parse(jsonText);
  } catch {
    geminiResponse = {
      answer: rawText || 'Не удалось сгенерировать ответ. Попробуйте переформулировать вопрос.',
      citations: [],
    };
  }

  const validChunkIds = new Set(topChunks.map((c) => c.id));
  const chunkMap = new Map(topChunks.map((c) => [c.id, c]));

  const citations = (geminiResponse.citations || [])
    .filter((c) => validChunkIds.has(c.chunkId))
    .map((c) => {
      const chunk = chunkMap.get(c.chunkId)!;
      return {
        chunkId: c.chunkId,
        bookId: chunk.bookId,
        bookTitle: bookTitles.get(chunk.bookId) || 'Untitled',
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        claim: c.claim || '',
      };
    });

  let answer = cleanupAnswerText(geminiResponse.answer || '');

  const paragraphs = answer.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const maxParagraphs = 6;
  if (paragraphs.length > maxParagraphs) {
    answer = paragraphs.slice(0, maxParagraphs).join('\n\n') + '…';
  }

  const tookMs = Date.now() - startTime;

  void recordByokUsage({
    uid: auth.uid,
    action: 'books:answer',
    tokens: totalTokenCount,
    firestore: db,
  });

  res.status(200).json({ ok: true, answer, citations, tookMs });
}
