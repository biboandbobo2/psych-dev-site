/**
 * POST /api/admin/books/create
 * Создание новой книги в библиотеке RAG
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ============================================================================
// CONSTANTS (inline for serverless)
// ============================================================================

const BOOK_COLLECTIONS = {
  books: 'books',
  chunks: 'book_chunks',
  jobs: 'ingestion_jobs',
} as const;

const BOOK_STORAGE_PATHS = {
  raw: (bookId: string) => `books/raw/${bookId}/original.pdf`,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface BookCreateRequest {
  title: string;
  authors: string[];
  language: 'ru' | 'en' | 'de' | 'fr' | 'es';
  year?: number;
  tags: string[];
}

interface BookCreateResponse {
  ok: true;
  bookId: string;
  message: string;
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
// AUTH HELPERS
// ============================================================================

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

async function verifyAuth(
  req: VercelRequest
): Promise<{ valid: true; uid: string; email: string } | { valid: false; error: string; code: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header', code: 'UNAUTHORIZED' };
  }

  const token = authHeader.slice(7);
  if (!token) {
    return { valid: false, error: 'Missing token', code: 'UNAUTHORIZED' };
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Check superadmin
    const email = decodedToken.email || '';
    const role = decodedToken.role as string | undefined;

    if (email !== SUPER_ADMIN_EMAIL && role !== 'super-admin') {
      return { valid: false, error: 'Insufficient permissions', code: 'FORBIDDEN' };
    }

    return { valid: true, uid: decodedToken.uid, email };
  } catch (e) {
    return { valid: false, error: 'Invalid token', code: 'UNAUTHORIZED' };
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

const VALID_LANGUAGES = ['ru', 'en', 'de', 'fr', 'es'] as const;
const VALID_TAGS = ['development', 'clinical', 'general', 'pedagogy', 'neuroscience'] as const;

function validateRequest(
  body: unknown
): { valid: true; data: BookCreateRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  // title
  if (typeof data.title !== 'string' || data.title.trim().length < 2) {
    return { valid: false, error: 'Title must be at least 2 characters' };
  }
  if (data.title.length > 500) {
    return { valid: false, error: 'Title too long (max 500 characters)' };
  }

  // authors
  if (!Array.isArray(data.authors) || data.authors.length === 0) {
    return { valid: false, error: 'At least one author required' };
  }
  if (data.authors.length > 20) {
    return { valid: false, error: 'Too many authors (max 20)' };
  }
  for (const author of data.authors) {
    if (typeof author !== 'string' || author.trim().length < 2) {
      return { valid: false, error: 'Author name must be at least 2 characters' };
    }
  }

  // language
  if (!VALID_LANGUAGES.includes(data.language as typeof VALID_LANGUAGES[number])) {
    return { valid: false, error: `Invalid language. Allowed: ${VALID_LANGUAGES.join(', ')}` };
  }

  // year (optional)
  if (data.year !== undefined && data.year !== null) {
    const year = Number(data.year);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > currentYear + 1) {
      return { valid: false, error: 'Invalid year' };
    }
  }

  // tags
  if (!Array.isArray(data.tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }
  for (const tag of data.tags) {
    if (!VALID_TAGS.includes(tag as typeof VALID_TAGS[number])) {
      return { valid: false, error: `Invalid tag: ${tag}` };
    }
  }

  return {
    valid: true,
    data: {
      title: data.title.trim(),
      authors: data.authors.map((a: string) => a.trim()),
      language: data.language as BookCreateRequest['language'],
      year: data.year ? Number(data.year) : undefined,
      tags: data.tags as string[],
    },
  };
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' } as ErrorResponse);
    return;
  }

  try {
    // Init Firebase Admin
    initFirebaseAdmin();

    // Verify auth
    const authResult = await verifyAuth(req);
    if (authResult.valid === false) {
      const status = authResult.code === 'FORBIDDEN' ? 403 : 401;
      res.status(status).json({ ok: false, error: authResult.error, code: authResult.code } as ErrorResponse);
      return;
    }

    // Validate request
    const validation = validateRequest(req.body);
    if (validation.valid === false) {
      res.status(400).json({ ok: false, error: validation.error, code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    const { data } = validation;

    // Create book document
    const db = getFirestore();
    const bookRef = db.collection(BOOK_COLLECTIONS.books).doc();
    const bookId = bookRef.id;

    const now = Timestamp.now();
    const bookDoc = {
      id: bookId,
      title: data.title,
      authors: data.authors,
      language: data.language,
      year: data.year ?? null,
      tags: data.tags,
      pageCount: null,
      storageRawPath: BOOK_STORAGE_PATHS.raw(bookId),
      storagePagesPath: null,
      status: 'draft',
      active: false,
      lastJobId: null,
      chunksCount: null,
      errors: [],
      createdAt: now,
      updatedAt: now,
      createdBy: authResult.uid,
    };

    await bookRef.set(bookDoc);

    res.status(201).json({
      ok: true,
      bookId,
      message: 'Book created successfully',
    } as BookCreateResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
