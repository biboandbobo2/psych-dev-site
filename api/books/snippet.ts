/**
 * GET /api/books/snippet
 * Возвращает длинную цитату из чанка (до 5000 символов)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as zlib from 'zlib';
import { promisify } from 'util';

import { BOOK_COLLECTIONS, BOOK_SEARCH_CONFIG, BOOK_STORAGE_PATHS } from '../lib/books';

const gunzip = promisify(zlib.gunzip);

// ============================================================================
// TYPES
// ============================================================================

interface SnippetResponse {
  ok: true;
  text: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  chapterTitle?: string;
}

interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
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
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
    });
  } catch (e) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' } as ErrorResponse);
    return;
  }

  try {
    initFirebaseAdmin();

    // Get params
    const { chunkId, maxChars: maxCharsParam } = req.query;

    if (!chunkId || typeof chunkId !== 'string') {
      res.status(400).json({ ok: false, error: 'chunkId is required', code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    const maxChars = Math.min(
      Number(maxCharsParam) || BOOK_SEARCH_CONFIG.snippetDefaultChars,
      BOOK_SEARCH_CONFIG.snippetMaxChars
    );

    const db = getFirestore();

    // Get chunk
    const chunkDoc = await db.collection(BOOK_COLLECTIONS.chunks).doc(chunkId).get();

    if (!chunkDoc.exists) {
      res.status(404).json({ ok: false, error: 'Chunk not found', code: 'NOT_FOUND' } as ErrorResponse);
      return;
    }

    const chunkData = chunkDoc.data()!;
    const bookId = chunkData.bookId;
    const pageStart = chunkData.pageStart || 1;
    const pageEnd = chunkData.pageEnd || 1;
    const chapterTitle = chunkData.chapterTitle;

    // Get book title
    const bookDoc = await db.collection(BOOK_COLLECTIONS.books).doc(bookId).get();
    const bookTitle = bookDoc.exists ? (bookDoc.data()?.title || 'Untitled') : 'Untitled';

    // Try to get full text from Storage
    let text = chunkData.preview || '';

    try {
      const storage = getStorage();
      const bucket = storage.bucket();
      const pagesPath = BOOK_STORAGE_PATHS.pages(bookId);
      const file = bucket.file(pagesPath);

      const [exists] = await file.exists();

      if (exists) {
        const [buffer] = await file.download();

        // Decompress if gzipped
        let pagesData: Array<{ page: number; text: string }>;

        try {
          const decompressed = await gunzip(buffer);
          pagesData = JSON.parse(decompressed.toString('utf-8'));
        } catch {
          // Try parsing as plain JSON
          pagesData = JSON.parse(buffer.toString('utf-8'));
        }

        // Get text from relevant pages
        const relevantPages = pagesData.filter(
          (p) => p.page >= pageStart && p.page <= pageEnd
        );

        if (relevantPages.length > 0) {
          text = relevantPages.map((p) => p.text).join('\n\n');
        }
      }
    } catch (e) {
      // Fall back to preview
      console.error('Error loading full text:', e);
    }

    // Truncate to maxChars
    if (text.length > maxChars) {
      // Try to cut at sentence end
      const truncated = text.slice(0, maxChars);
      const lastSentence = Math.max(
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('? ')
      );

      if (lastSentence > maxChars * 0.7) {
        text = truncated.slice(0, lastSentence + 1);
      } else {
        // Cut at word boundary
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxChars * 0.8) {
          text = truncated.slice(0, lastSpace) + '…';
        } else {
          text = truncated + '…';
        }
      }
    }

    res.status(200).json({
      ok: true,
      text,
      bookTitle,
      pageStart,
      pageEnd,
      ...(chapterTitle ? { chapterTitle } : {}),
    } as SnippetResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
