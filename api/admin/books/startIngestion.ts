/**
 * POST /api/admin/books/startIngestion
 * Запуск Cloud Function для обработки книги (извлечение текста, чанкинг, эмбеддинги)
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
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

interface StartIngestionRequest {
  bookId: string;
}

interface StartIngestionResponse {
  ok: true;
  jobId: string;
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
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
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
    const body = req.body as Record<string, unknown>;
    const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : '';

    if (!bookId) {
      res.status(400).json({ ok: false, error: 'bookId is required', code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    const db = getFirestore();
    const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      res.status(404).json({ ok: false, error: 'Book not found', code: 'NOT_FOUND' } as ErrorResponse);
      return;
    }

    const bookData = bookDoc.data();

    // Check book status
    if (bookData?.status === 'processing') {
      res.status(400).json({
        ok: false,
        error: 'Book is already being processed',
        code: 'ALREADY_PROCESSING',
      } as ErrorResponse);
      return;
    }

    if (bookData?.status === 'ready') {
      res.status(400).json({
        ok: false,
        error: 'Book is already processed. Delete chunks first to reprocess.',
        code: 'ALREADY_READY',
      } as ErrorResponse);
      return;
    }

    // Check file exists in Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const storagePath = BOOK_STORAGE_PATHS.raw(bookId);
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      res.status(400).json({
        ok: false,
        error: 'PDF file not uploaded yet',
        code: 'FILE_NOT_FOUND',
      } as ErrorResponse);
      return;
    }

    // Create ingestion job
    const jobRef = db.collection(BOOK_COLLECTIONS.jobs).doc();
    const jobId = jobRef.id;
    const now = Timestamp.now();

    await jobRef.set({
      id: jobId,
      bookId,
      status: 'queued',
      step: 'download',
      progress: { done: 0, total: 0 },
      startedAt: now,
      finishedAt: null,
      logs: ['Job created'],
      error: null,
    });

    // Update book status
    await bookRef.update({
      status: 'processing',
      lastJobId: jobId,
      errors: [],
      updatedAt: now,
    });

    // Trigger Cloud Function
    // The Cloud Function URL should be configured in environment
    const cloudFunctionUrl = process.env.INGEST_BOOK_FUNCTION_URL;

    if (cloudFunctionUrl) {
      // Fire-and-forget call to Cloud Function
      fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, jobId }),
      }).catch(() => {
        // Ignore errors - the job status will reflect any issues
      });
    } else {
      // If no Cloud Function URL, update job to indicate manual processing needed
      await jobRef.update({
        logs: ['Job created', 'Warning: INGEST_BOOK_FUNCTION_URL not configured. Manual processing required.'],
      });
    }

    res.status(200).json({
      ok: true,
      jobId,
      message: 'Ingestion started',
    } as StartIngestionResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
