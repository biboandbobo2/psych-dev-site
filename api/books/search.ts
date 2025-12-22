/**
 * POST /api/books/search
 * Retrieval: embed query → Firestore vector search → rerank
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

// ============================================================================
// CONSTANTS (inline for serverless)
// ============================================================================

const BOOK_COLLECTIONS = {
  books: 'books',
  chunks: 'book_chunks',
  jobs: 'ingestion_jobs',
} as const;

const BOOK_SEARCH_CONFIG = {
  maxBooksPerSearch: 10,
  minBooksPerSearch: 1,
  maxQuestionLength: 500,
  minQuestionLength: 3,
  candidateK: 50,
  contextK: 10,
  embeddingModel: 'text-embedding-004',
  embeddingDims: 768,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface SearchRequest {
  query: string;
  bookIds: string[];
}

interface ChunkResult {
  id: string;
  bookId: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  preview: string;
  score: number;
}

interface SearchResponse {
  ok: true;
  results: ChunkResult[];
  tookMs: number;
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
    });
  } catch (e) {
    throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
  }
}

// ============================================================================
// GEMINI EMBEDDING
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
// VALIDATION
// ============================================================================

function validateRequest(
  body: unknown
): { valid: true; data: SearchRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  // query
  if (typeof data.query !== 'string') {
    return { valid: false, error: 'Query is required' };
  }
  const query = data.query.trim();
  if (query.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
    return { valid: false, error: `Query too short (min ${BOOK_SEARCH_CONFIG.minQuestionLength} chars)` };
  }
  if (query.length > BOOK_SEARCH_CONFIG.maxQuestionLength) {
    return { valid: false, error: `Query too long (max ${BOOK_SEARCH_CONFIG.maxQuestionLength} chars)` };
  }

  // bookIds
  if (!Array.isArray(data.bookIds)) {
    return { valid: false, error: 'bookIds must be an array' };
  }
  if (data.bookIds.length < BOOK_SEARCH_CONFIG.minBooksPerSearch) {
    return { valid: false, error: `Select at least ${BOOK_SEARCH_CONFIG.minBooksPerSearch} book` };
  }
  if (data.bookIds.length > BOOK_SEARCH_CONFIG.maxBooksPerSearch) {
    return { valid: false, error: `Max ${BOOK_SEARCH_CONFIG.maxBooksPerSearch} books` };
  }
  for (const id of data.bookIds) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return { valid: false, error: 'Invalid book ID' };
    }
  }

  return {
    valid: true,
    data: {
      query,
      bookIds: data.bookIds.map((id: string) => id.trim()),
    },
  };
}

// ============================================================================
// LEXICAL RERANK
// ============================================================================

function computeLexicalScore(query: string, preview: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const previewLower = preview.toLowerCase();

  let matches = 0;
  for (const term of queryTerms) {
    if (previewLower.includes(term)) {
      matches++;
    }
  }

  return queryTerms.length > 0 ? matches / queryTerms.length : 0;
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
    const validation = validateRequest(req.body);
    if (validation.valid === false) {
      res.status(400).json({ ok: false, error: validation.error, code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    const { query, bookIds } = validation.data;
    const db = getFirestore();

    // Step 1: Get books info for titles
    const booksSnapshot = await db
      .collection(BOOK_COLLECTIONS.books)
      .where('__name__', 'in', bookIds)
      .get();

    const bookTitles = new Map<string, string>();
    booksSnapshot.docs.forEach((doc) => {
      bookTitles.set(doc.id, doc.data().title || 'Untitled');
    });

    // Step 2: Embed query
    const queryEmbedding = await embedQuery(query);

    // Step 3: Vector search with filter
    // Note: Firestore vector search with IN filter requires composite index
    // For now, we'll do separate queries per book and merge

    const allResults: Array<{
      id: string;
      bookId: string;
      pageStart: number;
      pageEnd: number;
      preview: string;
      vectorScore: number;
    }> = [];

    // Query each book separately (Firestore limitation with IN + vector)
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
          // Convert distance to score (1 - distance for cosine)
          const vectorScore = 1 - (index / snapshot.docs.length) * 0.5; // Approximate ranking

          allResults.push({
            id: doc.id,
            bookId: data.bookId,
            pageStart: data.pageStart || 1,
            pageEnd: data.pageEnd || 1,
            preview: data.preview || '',
            vectorScore,
          });
        });
      } catch (e) {
        // Skip books with no chunks or index issues
        console.error(`Error querying book ${bookId}:`, e);
      }
    }

    // Step 4: Hybrid rerank
    const reranked = allResults.map((result) => {
      const lexicalScore = computeLexicalScore(query, result.preview);
      const combinedScore = result.vectorScore * 0.7 + lexicalScore * 0.3;
      return { ...result, score: combinedScore };
    });

    // Sort by combined score
    reranked.sort((a, b) => b.score - a.score);

    // Take top K
    const topResults = reranked.slice(0, BOOK_SEARCH_CONFIG.contextK);

    // Format response
    const results: ChunkResult[] = topResults.map((r) => ({
      id: r.id,
      bookId: r.bookId,
      bookTitle: bookTitles.get(r.bookId) || 'Untitled',
      pageStart: r.pageStart,
      pageEnd: r.pageEnd,
      preview: r.preview,
      score: Math.round(r.score * 100) / 100,
    }));

    const tookMs = Date.now() - startTime;

    res.status(200).json({ ok: true, results, tookMs } as SearchResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
