import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import type { VideoTranscriptSearchChunkDoc } from '../src/types/videoTranscripts.js';
import { VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION } from '../src/types/videoTranscripts.js';

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
  'those', 'it', 'its',
  'и', 'в', 'на', 'с', 'по', 'для', 'из', 'к', 'о', 'об', 'от', 'до', 'за', 'при', 'во', 'не',
  'как', 'что', 'это', 'или', 'но', 'а', 'же', 'ли', 'бы', 'его', 'её', 'их', 'то', 'все',
  'вся', 'всё',
]);

const MAX_MATCHED_CHUNKS = 120;
const TRANSCRIPT_API_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https:\/\/psych-dev-site\.vercel\.app$/i,
  /^https:\/\/psych-dev-site(?:-[a-z0-9-]+)?-alexey-zykovs-projects\.vercel\.app$/i,
  /^https:\/\/psych-dev-site-git-[a-z0-9-]+-alexey-zykovs-projects\.vercel\.app$/i,
] as const;

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  }

  const serviceAccount = JSON.parse(json);
  initializeApp({ credential: cert(serviceAccount) });
}

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
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

function getAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return null;
  }

  return TRANSCRIPT_API_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
    ? origin
    : null;
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
    const snapshot = await db.collectionGroup(VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION).get();
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
