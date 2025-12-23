/**
 * DELETE /api/admin/books/delete
 * Удаление книги и всех связанных данных
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Storage } from '@google-cloud/storage';

// ============================================================================
// CONSTANTS
// ============================================================================

const BOOK_COLLECTIONS = {
  books: 'books',
  chunks: 'book_chunks',
  jobs: 'ingestion_jobs',
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface DeleteRequest {
  bookId: string;
}

interface DeleteResponse {
  ok: true;
  message: string;
  deleted: {
    book: boolean;
    chunks: number;
    jobs: number;
    file: boolean;
  };
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
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'DELETE') {
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

    // Parse request
    const { bookId } = req.body as DeleteRequest;

    if (!bookId || typeof bookId !== 'string') {
      res.status(400).json({ ok: false, error: 'bookId is required', code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    // Check book exists
    const db = getFirestore();
    const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      res.status(404).json({ ok: false, error: 'Book not found', code: 'NOT_FOUND' } as ErrorResponse);
      return;
    }

    // Delete chunks
    const chunksSnapshot = await db.collection(BOOK_COLLECTIONS.chunks)
      .where('bookId', '==', bookId)
      .get();

    const chunkBatch = db.batch();
    chunksSnapshot.docs.forEach(doc => {
      chunkBatch.delete(doc.ref);
    });
    await chunkBatch.commit();

    // Delete jobs
    const jobsSnapshot = await db.collection(BOOK_COLLECTIONS.jobs)
      .where('bookId', '==', bookId)
      .get();

    const jobBatch = db.batch();
    jobsSnapshot.docs.forEach(doc => {
      jobBatch.delete(doc.ref);
    });
    await jobBatch.commit();

    // Delete file from Storage
    let fileDeleted = false;
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const serviceAccount = JSON.parse(serviceAccountJson!);

      const storage = new Storage({
        projectId: serviceAccount.project_id,
        credentials: serviceAccount,
      });

      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`;
      const bucket = storage.bucket(bucketName);
      const storagePath = `books/raw/${bookId}/original.pdf`;
      const file = bucket.file(storagePath);

      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        fileDeleted = true;
      }
    } catch (storageError) {
      // Ignore storage errors - book will still be deleted from Firestore
      console.error('Storage deletion failed:', storageError);
    }

    // Delete book document
    await bookRef.delete();

    res.status(200).json({
      ok: true,
      message: 'Book and related data deleted successfully',
      deleted: {
        book: true,
        chunks: chunksSnapshot.size,
        jobs: jobsSnapshot.size,
        file: fileDeleted,
      },
    } as DeleteResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
