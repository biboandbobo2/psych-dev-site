/**
 * POST /api/admin/books/upload
 * Прямая загрузка PDF в Firebase Storage через API
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// ============================================================================
// CONSTANTS
// ============================================================================

const BOOK_COLLECTIONS = {
  books: 'books',
} as const;

const MAX_BOOK_FILE_SIZE = 50 * 1024 * 1024;

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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

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
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    initFirebaseAdmin();

    // Verify auth
    const authResult = await verifyAuth(req);
    if (authResult.valid === false) {
      const status = authResult.code === 'FORBIDDEN' ? 403 : 401;
      res.status(status).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }

    // Get bookId from query
    const bookId = req.query.bookId as string;
    if (!bookId) {
      res.status(400).json({ ok: false, error: 'bookId is required' });
      return;
    }

    // Check book exists
    const db = getFirestore();
    const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      res.status(404).json({ ok: false, error: 'Book not found' });
      return;
    }

    const bookData = bookDoc.data();
    if (bookData?.status !== 'draft' && bookData?.status !== 'error') {
      res.status(400).json({ ok: false, error: 'Book already uploaded or processing' });
      return;
    }

    // Get file from request body (base64 encoded)
    const { fileData, contentType } = req.body as { fileData: string; contentType: string };

    if (!fileData || contentType !== 'application/pdf') {
      res.status(400).json({ ok: false, error: 'Invalid file data or content type' });
      return;
    }

    // Decode base64
    const buffer = Buffer.from(fileData, 'base64');

    if (buffer.length > MAX_BOOK_FILE_SIZE) {
      res.status(400).json({ ok: false, error: 'File too large (max 50 MB)' });
      return;
    }

    // Upload to Firebase Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const storagePath = `books/raw/${bookId}/original.pdf`;
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Update book status
    await bookRef.update({
      status: 'uploaded',
      updatedAt: Timestamp.now(),
    });

    res.status(200).json({
      ok: true,
      storagePath,
      size: buffer.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message });
  }
}
