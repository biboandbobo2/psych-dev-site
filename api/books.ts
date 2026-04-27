/**
 * GET/POST /api/books
 * Unified endpoint для public book operations.
 * Actions: list, snippet (public, GET) / search, answer (BYOK + auth, POST).
 *
 * Helpers и actions вынесены в api/lib/booksHelpers.ts и
 * api/lib/booksActions.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from 'firebase-admin/firestore';
import {
  enforceIpRateLimit,
  getClientIp,
  initFirebaseAdmin,
  setSharedCorsHeaders,
} from '../src/lib/api-server/sharedApiRuntime.js';
import {
  BOOK_COLLECTIONS,
  BOOK_SEARCH_CONFIG,
  RL_AI,
  RL_PUBLIC,
  getAdjacentChunks,
} from './lib/booksHelpers.js';
import {
  handleBooksAnswerAction,
  handleBooksSearchAction,
} from './lib/booksActions.js';

// Re-export для совместимости с tests/api/books.test.ts
export {
  BOOK_COLLECTIONS,
  BOOK_SEARCH_CONFIG,
  BOOK_STORAGE_PATHS,
  computeLexicalScore,
  SYSTEM_PROMPT,
} from './lib/booksHelpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = setSharedCorsHeaders(req, res);

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
    const action = (req.query.action as string) || (req.body?.action as string) || '';
    const ip = getClientIp(req);

    // LIST: GET public books
    if (action === 'list' && req.method === 'GET') {
      if (!enforceIpRateLimit('books:public', ip, RL_PUBLIC)) {
        res.status(429).json({ ok: false, error: 'Слишком много запросов', code: 'RATE_LIMIT' });
        return;
      }
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
      if (!enforceIpRateLimit('books:public', ip, RL_PUBLIC)) {
        res.status(429).json({ ok: false, error: 'Слишком много запросов', code: 'RATE_LIMIT' });
        return;
      }
      const { chunkId, maxChars: maxCharsParam } = req.query;

      if (!chunkId || typeof chunkId !== 'string') {
        res.status(400).json({ ok: false, error: 'chunkId is required', code: 'VALIDATION_ERROR' });
        return;
      }

      // maxChars не используется на отрезке (используем full text), оставлено
      // для API-совместимости: клиент может его передавать.
      void Math.min(
        Number(maxCharsParam) || BOOK_SEARCH_CONFIG.snippetDefaultChars,
        BOOK_SEARCH_CONFIG.snippetMaxChars,
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
      const bookTitle = bookDoc.exists ? bookDoc.data()?.title || 'Untitled' : 'Untitled';

      const text = chunkData.text || chunkData.preview || '';
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

    if (action === 'search') {
      if (!enforceIpRateLimit('books:ai', ip, RL_AI)) {
        res.status(429).json({ ok: false, error: 'Слишком много запросов', code: 'RATE_LIMIT' });
        return;
      }
      await handleBooksSearchAction(req, res, db);
      return;
    }

    if (action === 'answer') {
      if (!enforceIpRateLimit('books:ai', ip, RL_AI)) {
        res.status(429).json({ ok: false, error: 'Слишком много запросов', code: 'RATE_LIMIT' });
        return;
      }
      await handleBooksAnswerAction(req, res, db);
      return;
    }

    res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message });
  }
}
