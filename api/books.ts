/**
 * GET/POST /api/books
 * Unified endpoint for all public book operations
 * Actions: list, search, answer, snippet
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleGenAI } from '@google/genai';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

const BOOK_COLLECTIONS = { books: 'books', chunks: 'book_chunks', jobs: 'ingestion_jobs' } as const;
const BOOK_SEARCH_CONFIG = {
  maxBooksPerSearch: 10,
  minBooksPerSearch: 1,
  maxQuestionLength: 500,
  minQuestionLength: 3,
  candidateK: 50,
  contextK: 10,
  embeddingModel: 'text-embedding-004',
  embeddingDims: 768,
  answerMaxParagraphs: 4,
  snippetMaxChars: 5000,
  snippetDefaultChars: 3000,
} as const;

const BOOK_STORAGE_PATHS = { pages: (bookId: string) => `books/text/${bookId}/pages.json.gz` } as const;

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  const sa = JSON.parse(json);
  initializeApp({
    credential: cert(sa),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`,
  });
}

let genaiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

async function embedQuery(query: string): Promise<number[]> {
  const client = getGenAI();
  const result = await client.models.embedContent({
    model: BOOK_SEARCH_CONFIG.embeddingModel,
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: { outputDimensionality: BOOK_SEARCH_CONFIG.embeddingDims },
  });
  const embedding = result.embeddings?.[0]?.values;
  if (!embedding) throw new Error('Failed to get embedding');
  return embedding;
}

interface AdjacentChunk {
  id: string;
  pageStart: number;
  pageEnd: number;
  preview: string;
  text: string;
}

async function getAdjacentChunks(
  db: FirebaseFirestore.Firestore,
  bookId: string,
  currentPageStart: number
): Promise<{ prev: AdjacentChunk | null; next: AdjacentChunk | null }> {
  // Get previous chunk (page before current)
  const prevQuery = db
    .collection(BOOK_COLLECTIONS.chunks)
    .where('bookId', '==', bookId)
    .where('pageEnd', '<', currentPageStart)
    .orderBy('pageEnd', 'desc')
    .limit(1);

  // Get next chunk (page after current)
  const nextQuery = db
    .collection(BOOK_COLLECTIONS.chunks)
    .where('bookId', '==', bookId)
    .where('pageStart', '>', currentPageStart)
    .orderBy('pageStart', 'asc')
    .limit(1);

  const [prevSnap, nextSnap] = await Promise.all([prevQuery.get(), nextQuery.get()]);

  const prev = prevSnap.docs[0]
    ? {
        id: prevSnap.docs[0].id,
        pageStart: prevSnap.docs[0].data().pageStart || 1,
        pageEnd: prevSnap.docs[0].data().pageEnd || 1,
        preview: prevSnap.docs[0].data().preview || '',
        text: prevSnap.docs[0].data().text || '',
      }
    : null;

  const next = nextSnap.docs[0]
    ? {
        id: nextSnap.docs[0].id,
        pageStart: nextSnap.docs[0].data().pageStart || 1,
        pageEnd: nextSnap.docs[0].data().pageEnd || 1,
        preview: nextSnap.docs[0].data().preview || '',
        text: nextSnap.docs[0].data().text || '',
      }
    : null;

  return { prev, next };
}

function computeLexicalScore(query: string, preview: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const previewLower = preview.toLowerCase();
  let matches = 0;
  for (const term of queryTerms) {
    if (previewLower.includes(term)) matches++;
  }
  return queryTerms.length > 0 ? matches / queryTerms.length : 0;
}

const SYSTEM_PROMPT = `Ты — эксперт-психолог и преподаватель. Твоя задача — дать развёрнутый, информативный ответ на вопрос студента, основываясь ИСКЛЮЧИТЕЛЬНО на предоставленных источниках.

ПРАВИЛА ОТВЕТА:
1. Пиши развёрнуто — от 3 до 6 абзацев. Раскрой тему полноценно.
2. Используй только информацию из предоставленных источников.
3. Пиши ЧИСТЫМ ТЕКСТОМ для чтения человеком. НИКАКИХ:
   - Ссылок на источники в тексте ответа (НЕ пиши [chunkId=...], [SOURCE], [1], (источник) и т.п.)
   - Технических символов (**, *, #, \`, [], {}, <>)
   - Маркеров списка (-, •, 1., 2.)
   - Markdown-разметки
4. Структурируй ответ абзацами. Каждый абзац — отдельный аспект темы.
5. Ссылки на источники указывай ТОЛЬКО в массиве citations, НЕ в тексте ответа.
6. Если информации недостаточно — честно укажи это.
7. Отвечай на русском языке.

ФОРМАТ ОТВЕТА (строго JSON):
{
  "answer": "Чистый текст ответа БЕЗ каких-либо ссылок и технических символов. Только абзацы с пробелами между ними.",
  "citations": [
    {"chunkId": "abc123", "claim": "К какому утверждению в ответе относится этот источник"}
  ]
}

КРИТИЧЕСКИ ВАЖНО:
- В поле "answer" должен быть ТОЛЬКО читаемый текст
- НЕ вставляй chunkId, номера источников или любые ссылки в текст ответа
- Все ссылки на источники — ТОЛЬКО в массиве citations
- Верни ТОЛЬКО валидный JSON без markdown-блоков`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    initFirebaseAdmin();
    const action = req.query.action as string || req.body?.action as string || '';

    // LIST: GET public books
    if (action === 'list' && req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

      const db = getFirestore();
      const snapshot = await db
        .collection(BOOK_COLLECTIONS.books)
        .where('status', '==', 'ready')
        .where('active', '==', true)
        .orderBy('title', 'asc')
        .get();

      const books = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || '',
          authors: d.authors || [],
          language: d.language || 'ru',
          year: d.year ?? null,
          tags: d.tags || [],
        };
      });

      res.status(200).json({ ok: true, books });
      return;
    }

    // SNIPPET: GET chunk snippet
    if (action === 'snippet' && req.method === 'GET') {
      const { chunkId, maxChars: maxCharsParam } = req.query;

      if (!chunkId || typeof chunkId !== 'string') {
        res.status(400).json({ ok: false, error: 'chunkId is required', code: 'VALIDATION_ERROR' });
        return;
      }

      const maxChars = Math.min(
        Number(maxCharsParam) || BOOK_SEARCH_CONFIG.snippetDefaultChars,
        BOOK_SEARCH_CONFIG.snippetMaxChars
      );

      const db = getFirestore();
      const chunkDoc = await db.collection(BOOK_COLLECTIONS.chunks).doc(chunkId).get();

      if (!chunkDoc.exists) {
        res.status(404).json({ ok: false, error: 'Chunk not found', code: 'NOT_FOUND' });
        return;
      }

      const chunkData = chunkDoc.data()!;
      const bookId = chunkData.bookId;
      const pageStart = chunkData.pageStart || 1;
      const pageEnd = chunkData.pageEnd || 1;
      const chapterTitle = chunkData.chapterTitle;

      const bookDoc = await db.collection(BOOK_COLLECTIONS.books).doc(bookId).get();
      const bookTitle = bookDoc.exists ? (bookDoc.data()?.title || 'Untitled') : 'Untitled';

      // Use full text from chunk (no truncation for citation display)
      const text = chunkData.text || chunkData.preview || '';

      // Get adjacent chunks for context
      const adjacentChunks = await getAdjacentChunks(db, bookId, chunkData.pageStart);

      res.status(200).json({
        ok: true,
        text,
        bookTitle,
        pageStart,
        pageEnd,
        ...(chapterTitle ? { chapterTitle } : {}),
        prevChunk: adjacentChunks.prev,
        nextChunk: adjacentChunks.next,
      });
      return;
    }

    // All other actions require POST
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const db = getFirestore();
    const body = req.body as Record<string, unknown>;

    // SEARCH
    if (action === 'search') {
      const startTime = Date.now();

      const query = typeof body?.query === 'string' ? body.query.trim() : '';
      const bookIds = Array.isArray(body?.bookIds) ? body.bookIds : [];

      if (query.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
        res.status(400).json({ ok: false, error: 'Query too short', code: 'VALIDATION_ERROR' });
        return;
      }

      if (bookIds.length < BOOK_SEARCH_CONFIG.minBooksPerSearch || bookIds.length > BOOK_SEARCH_CONFIG.maxBooksPerSearch) {
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

      const queryEmbedding = await embedQuery(query);

      const allResults: Array<{
        id: string;
        bookId: string;
        pageStart: number;
        pageEnd: number;
        preview: string;
        vectorScore: number;
      }> = [];

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
        } catch {}
      }

      const reranked = allResults.map((result) => {
        const lexicalScore = computeLexicalScore(query, result.preview);
        const combinedScore = result.vectorScore * 0.7 + lexicalScore * 0.3;
        return { ...result, score: combinedScore };
      });

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
      res.status(200).json({ ok: true, results, tookMs });
      return;
    }

    // ANSWER
    if (action === 'answer') {
      const startTime = Date.now();

      const query = typeof body?.query === 'string' ? body.query.trim() : '';
      const bookIds = Array.isArray(body?.bookIds) ? body.bookIds : [];

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

      const queryEmbedding = await embedQuery(query);

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
        } catch {}
      }

      const topChunks = allChunks.slice(0, BOOK_SEARCH_CONFIG.contextK);

      if (topChunks.length === 0) {
        res.status(200).json({
          ok: true,
          answer: 'К сожалению, в выбранных книгах не найдено релевантной информации по вашему вопросу.',
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

      const client = getGenAI();
      const prompt = `${SYSTEM_PROMPT}

ИСТОЧНИКИ:
${context}

ВОПРОС: ${query}`;

      let geminiResponse: { answer: string; citations: Array<{ chunkId: string; claim: string }> };
      let rawText = '';

      try {
        const result = await client.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.4, maxOutputTokens: 4000 },
        });

        rawText = result.text || '';
        let jsonText = rawText.trim();

        // Try to extract JSON from markdown code block
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1].trim();
        } else {
          jsonText = jsonText.replace(/```json\s*\n?|\n?```/g, '').trim();
        }

        // If still has non-JSON text, try to extract JSON object
        if (!jsonText.startsWith('{')) {
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonText = jsonMatch[0];
        }

        geminiResponse = JSON.parse(jsonText);
      } catch (parseError) {
        // Fallback: return raw text as answer without citations
        geminiResponse = {
          answer: rawText || 'Не удалось сгенерировать ответ. Попробуйте переформулировать вопрос.',
          citations: []
        };
      }

      const validChunkIds = new Set(topChunks.map((c) => c.id));
      const chunkMap = new Map(topChunks.map((c) => [c.id, c]));

      const citations = (geminiResponse!.citations || [])
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

      let answer = geminiResponse!.answer || '';
      // Clean up any remaining markdown symbols and source references
      answer = answer
        // Remove chunkId references like [chunkId=abc123] or (chunkId: abc123)
        .replace(/\[chunkId[=:][^\]]+\]/gi, '')
        .replace(/\(chunkId[=:][^\)]+\)/gi, '')
        // Remove SOURCE references
        .replace(/\[SOURCE[^\]]*\]/gi, '')
        .replace(/\[\/SOURCE\]/gi, '')
        // Remove numbered references like [1], [2], (1), (2)
        .replace(/\[\d+\]/g, '')
        .replace(/\(\d+\)/g, '')
        // Remove markdown
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/^#+\s*/gm, '')
        .replace(/`/g, '')
        .replace(/^\s*[-•]\s*/gm, '')
        .replace(/^\s*\d+\.\s*/gm, '')
        // Clean up extra spaces
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+\./g, '.')
        .replace(/\s+,/g, ',')
        .trim();

      const paragraphs = answer.split(/\n\n+/).filter((p) => p.trim().length > 0);
      const maxParagraphs = 6; // Allow longer answers
      if (paragraphs.length > maxParagraphs) {
        answer = paragraphs.slice(0, maxParagraphs).join('\n\n') + '…';
      }

      const tookMs = Date.now() - startTime;

      res.status(200).json({ ok: true, answer, citations, tookMs });
      return;
    }

    res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message });
  }
}
