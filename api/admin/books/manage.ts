/**
 * POST /api/admin/books/manage
 * Управление книгами: delete, toggleActive
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Storage } from '@google-cloud/storage';

const BOOK_COLLECTIONS = {
  books: 'books',
  chunks: 'book_chunks',
  jobs: 'ingestion_jobs',
} as const;

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
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

async function verifyAuth(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header', code: 'UNAUTHORIZED' } as const;
  }
  const token = authHeader.slice(7);
  if (!token) return { valid: false, error: 'Missing token', code: 'UNAUTHORIZED' } as const;
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const email = decodedToken.email || '';
    const role = decodedToken.role as string | undefined;
    if (email !== SUPER_ADMIN_EMAIL && role !== 'super-admin') {
      return { valid: false, error: 'Insufficient permissions', code: 'FORBIDDEN' } as const;
    }
    return { valid: true, uid: decodedToken.uid, email } as const;
  } catch (e) {
    return { valid: false, error: 'Invalid token', code: 'UNAUTHORIZED' } as const;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    initFirebaseAdmin();
    const authResult = await verifyAuth(req);
    if (authResult.valid === false) {
      const status = authResult.code === 'FORBIDDEN' ? 403 : 401;
      res.status(status).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const action = typeof body?.action === 'string' ? body.action : '';
    const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : '';

    if (!bookId) {
      res.status(400).json({ ok: false, error: 'bookId is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const db = getFirestore();
    const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);

    if (action === 'toggleActive') {
      // TOGGLE ACTIVE
      const bookDoc = await bookRef.get();
      if (!bookDoc.exists) {
        res.status(404).json({ ok: false, error: 'Book not found', code: 'NOT_FOUND' });
        return;
      }
      const bookData = bookDoc.data();
      const currentActive = bookData?.active ?? false;
      const newActive = !currentActive;
      await bookRef.update({ active: newActive, updatedAt: Timestamp.now() });
      res.status(200).json({ ok: true, active: newActive });
    } else if (action === 'delete') {
      // DELETE
      const bookDoc = await bookRef.get();
      if (!bookDoc.exists) {
        res.status(404).json({ ok: false, error: 'Book not found', code: 'NOT_FOUND' });
        return;
      }

      // Delete chunks
      const chunksSnapshot = await db.collection(BOOK_COLLECTIONS.chunks).where('bookId', '==', bookId).get();
      const chunksBatch = db.batch();
      chunksSnapshot.docs.forEach((doc) => chunksBatch.delete(doc.ref));
      await chunksBatch.commit();

      // Delete jobs
      const jobsSnapshot = await db.collection(BOOK_COLLECTIONS.jobs).where('bookId', '==', bookId).get();
      const jobsBatch = db.batch();
      jobsSnapshot.docs.forEach((doc) => jobsBatch.delete(doc.ref));
      await jobsBatch.commit();

      // Delete file from Storage
      let fileDeleted = false;
      try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountJson) {
          const serviceAccount = JSON.parse(serviceAccountJson);
          const storage = new Storage({ projectId: serviceAccount.project_id, credentials: serviceAccount });
          const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`;
          const filePath = `books/raw/${bookId}/original.pdf`;
          await storage.bucket(bucketName).file(filePath).delete();
          fileDeleted = true;
        }
      } catch (e) {
        // Ignore file deletion errors
      }

      // Delete book document
      await bookRef.delete();

      res.status(200).json({
        ok: true,
        message: 'Book deleted successfully',
        deleted: {
          book: true,
          chunks: chunksSnapshot.size,
          jobs: jobsSnapshot.size,
          file: fileDeleted,
        },
      });
    } else {
      res.status(400).json({ ok: false, error: 'Invalid action. Use "delete" or "toggleActive"', code: 'INVALID_ACTION' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' });
  }
}
