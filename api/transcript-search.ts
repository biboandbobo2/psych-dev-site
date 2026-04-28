import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from 'firebase-admin/firestore';

import { getAllowedAppOrigin } from '../src/lib/appOrigins.js';
import { initFirebaseAdmin } from '../src/lib/api-server/sharedApiRuntime.js';
import type { VideoTranscriptSearchChunkDoc } from '../src/types/videoTranscripts.js';
import {
  TRANSCRIPT_STOP_WORDS,
  TRANSCRIPT_TOKEN_MIN_LENGTH,
  VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION,
} from '../src/types/videoTranscripts.js';

const MAX_MATCHED_CHUNKS = 120;
// Firestore lazyt array-contains-any до 30 значений в запросе.
const MAX_QUERY_TOKENS = 30;

function matchesQuery(text: string, queryWords: string[]) {
  if (queryWords.length === 0) {
    return false;
  }

  const lowerText = text.toLowerCase();
  if (queryWords.length === 1) {
    return lowerText.includes(queryWords[0]);
  }

  return queryWords.every((word) => lowerText.includes(word));
}

function countMatches(text: string, queryWords: string[]) {
  return queryWords.reduce((count, word) => {
    const matches = text.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return count + (matches?.length ?? 0);
  }, 0);
}

function normalizeQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/u)
    .filter(
      (word) => word.length >= TRANSCRIPT_TOKEN_MIN_LENGTH && !TRANSCRIPT_STOP_WORDS.has(word),
    );
}

function getAllowedOrigin(origin: string | undefined) {
  return getAllowedAppOrigin(origin);
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = getAllowedOrigin(req.headers.origin);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const query = typeof req.query.q === 'string' ? req.query.q : '';
  const queryWords = normalizeQuery(query);

  if (queryWords.length === 0) {
    res.status(200).json({ ok: true, chunks: [] });
    return;
  }

  try {
    initFirebaseAdmin();

    const db = getFirestore();
    // array-contains-any принимает до 30 значений; для query из >30 слов берём
    // первые 30 — оставшиеся проверяет matchesQuery в коде ниже.
    const indexedTokens = queryWords.slice(0, MAX_QUERY_TOKENS);
    const snapshot = await db
      .collectionGroup(VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION)
      .where('searchTokens', 'array-contains-any', indexedTokens)
      .get();
    const chunks = snapshot.docs
      .map((docSnap) => docSnap.data() as VideoTranscriptSearchChunkDoc)
      .filter((chunk) => matchesQuery(chunk.normalizedText, queryWords))
      .map((chunk) => ({
        ...chunk,
        _score: 6 + countMatches(chunk.normalizedText, queryWords),
      }))
      .sort((a, b) => {
        if (b._score !== a._score) {
          return b._score - a._score;
        }

        return a.startMs - b.startMs;
      })
      .slice(0, MAX_MATCHED_CHUNKS)
      .map(({ _score, ...chunk }) => chunk);

    res.status(200).json({ ok: true, chunks });
  } catch {
    res.status(500).json({
      ok: false,
      error: 'Транскриптный поиск временно недоступен. Попробуйте ещё раз позже.',
    });
  }
}
