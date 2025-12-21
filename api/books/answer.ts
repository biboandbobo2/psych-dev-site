/**
 * POST /api/books/answer
 * RAG: генерирует ответ Gemini с цитатами из найденных чанков
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

import { BOOK_COLLECTIONS, BOOK_SEARCH_CONFIG } from '../lib/books';

// ============================================================================
// TYPES
// ============================================================================

interface AnswerRequest {
  query: string;
  bookIds: string[];
}

interface Citation {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  claim: string;
}

interface AnswerResponse {
  ok: true;
  answer: string;
  citations: Citation[];
  tookMs: number;
}

interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

interface GeminiResponse {
  answer: string;
  citations: Array<{ chunkId: string; claim: string }>;
}

// ============================================================================
// FIREBASE ADMIN INIT
// ============================================================================

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
  }
}

// ============================================================================
// GEMINI
// ============================================================================

let genaiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

async function embedQuery(query: string): Promise<number[]> {
  const client = getGenAI();
  const result = await client.models.embedContent({
    model: BOOK_SEARCH_CONFIG.embeddingModel,
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: {
      outputDimensionality: BOOK_SEARCH_CONFIG.embeddingDims,
    },
  });

  const embedding = result.embeddings?.[0]?.values;
  if (!embedding) {
    throw new Error('Failed to get embedding');
  }
  return embedding;
}

// ============================================================================
// RAG PROMPT
// ============================================================================

const SYSTEM_PROMPT = `Ты — ИИ-помощник по психологии. Отвечай на вопрос, опираясь ТОЛЬКО на предоставленные источники.

ПРАВИЛА:
1. Ответ должен быть до 4 абзацев максимум
2. Опирайся только на предоставленные источники [SOURCE]
3. Для каждого утверждения указывай chunkId источника
4. Если информации недостаточно — честно скажи об этом
5. Отвечай на русском языке

ФОРМАТ ОТВЕТА (строго JSON):
{
  "answer": "Ваш ответ здесь. Максимум 4 абзаца.",
  "citations": [
    {"chunkId": "abc123", "claim": "К какому утверждению относится"}
  ]
}

Верни ТОЛЬКО валидный JSON, без markdown блоков.`;

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' } as ErrorResponse);
    return;
  }

  const startTime = Date.now();

  try {
    initFirebaseAdmin();

    // Validate
    const body = req.body as Record<string, unknown>;
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const bookIds = Array.isArray(body?.bookIds) ? body.bookIds : [];

    if (query.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
      res.status(400).json({ ok: false, error: 'Query too short', code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    if (bookIds.length === 0 || bookIds.length > BOOK_SEARCH_CONFIG.maxBooksPerSearch) {
      res.status(400).json({ ok: false, error: 'Invalid bookIds', code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    const db = getFirestore();

    // Step 1: Get books info
    const booksSnapshot = await db
      .collection(BOOK_COLLECTIONS.books)
      .where('__name__', 'in', bookIds)
      .get();

    const bookTitles = new Map<string, string>();
    booksSnapshot.docs.forEach((doc) => {
      bookTitles.set(doc.id, doc.data().title || 'Untitled');
    });

    // Step 2: Embed query and search
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
      } catch (e) {
        // Skip errors
      }
    }

    // Take top K chunks
    const topChunks = allChunks.slice(0, BOOK_SEARCH_CONFIG.contextK);

    if (topChunks.length === 0) {
      res.status(200).json({
        ok: true,
        answer: 'К сожалению, в выбранных книгах не найдено релевантной информации по вашему вопросу.',
        citations: [],
        tookMs: Date.now() - startTime,
      } as AnswerResponse);
      return;
    }

    // Step 3: Build context
    const context = topChunks
      .map((chunk) => {
        const bookTitle = bookTitles.get(chunk.bookId) || 'Untitled';
        return `[SOURCE chunkId="${chunk.id}" book="${bookTitle}" pages="${chunk.pageStart}-${chunk.pageEnd}"]
${chunk.preview}
[/SOURCE]`;
      })
      .join('\n\n');

    // Step 4: Generate answer
    const client = getGenAI();

    const prompt = `${SYSTEM_PROMPT}

ИСТОЧНИКИ:
${context}

ВОПРОС: ${query}`;

    let geminiResponse: GeminiResponse;
    let attempts = 0;

    while (attempts < 2) {
      attempts++;
      try {
        const result = await client.models.generateContent({
          model: 'gemini-2.5-flash-preview-05-20',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        });

        const text = result.text || '';

        // Parse JSON from response
        // Remove markdown code blocks if present
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();

        geminiResponse = JSON.parse(jsonText);
        break;
      } catch (parseError) {
        if (attempts >= 2) {
          throw new Error('Failed to parse Gemini response as JSON');
        }
        // Retry with stricter prompt
      }
    }

    // Step 5: Validate and enrich citations
    const validChunkIds = new Set(topChunks.map((c) => c.id));
    const chunkMap = new Map(topChunks.map((c) => [c.id, c]));

    const citations: Citation[] = (geminiResponse!.citations || [])
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

    // Truncate answer to 4 paragraphs
    let answer = geminiResponse!.answer || '';
    const paragraphs = answer.split(/\n\n+/).filter((p) => p.trim().length > 0);
    if (paragraphs.length > BOOK_SEARCH_CONFIG.answerMaxParagraphs) {
      answer = paragraphs.slice(0, BOOK_SEARCH_CONFIG.answerMaxParagraphs).join('\n\n') + '…';
    }

    const tookMs = Date.now() - startTime;

    res.status(200).json({
      ok: true,
      answer,
      citations,
      tookMs,
    } as AnswerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
