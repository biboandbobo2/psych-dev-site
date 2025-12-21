/**
 * POST /api/admin/books/uploadUrl
 * Генерация signed URL для загрузки PDF в Firebase Storage
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

import { BOOK_COLLECTIONS, BOOK_STORAGE_PATHS, MAX_BOOK_FILE_SIZE } from '../../../src/constants/books';

// ============================================================================
// TYPES
// ============================================================================

interface UploadUrlRequest {
  bookId: string;
  contentType: string;
  fileSize: number;
}

interface UploadUrlResponse {
  ok: true;
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
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
// VALIDATION
// ============================================================================

function validateRequest(
  body: unknown
): { valid: true; data: UploadUrlRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  // bookId
  if (typeof data.bookId !== 'string' || data.bookId.trim().length === 0) {
    return { valid: false, error: 'bookId is required' };
  }

  // contentType
  if (data.contentType !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are supported' };
  }

  // fileSize
  const fileSize = Number(data.fileSize);
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { valid: false, error: 'Invalid file size' };
  }
  if (fileSize > MAX_BOOK_FILE_SIZE) {
    const maxMB = Math.round(MAX_BOOK_FILE_SIZE / 1024 / 1024);
    return { valid: false, error: `File too large (max ${maxMB} MB)` };
  }

  return {
    valid: true,
    data: {
      bookId: data.bookId.trim(),
      contentType: data.contentType,
      fileSize,
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

    // Check book exists and is in correct status
    const db = getFirestore();
    const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(data.bookId);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      res.status(404).json({ ok: false, error: 'Book not found', code: 'NOT_FOUND' } as ErrorResponse);
      return;
    }

    const bookData = bookDoc.data();
    if (bookData?.status !== 'draft' && bookData?.status !== 'error') {
      res.status(400).json({
        ok: false,
        error: 'Book already has a file uploaded or is being processed',
        code: 'INVALID_STATUS',
      } as ErrorResponse);
      return;
    }

    // Generate signed URL
    const storage = getStorage();
    const bucket = storage.bucket();
    const storagePath = BOOK_STORAGE_PATHS.raw(data.bookId);
    const file = bucket.file(storagePath);

    // URL expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: data.contentType,
    });

    // Update book status to indicate upload is expected
    await bookRef.update({
      updatedAt: Timestamp.now(),
    });

    res.status(200).json({
      ok: true,
      uploadUrl,
      storagePath,
      expiresAt: expiresAt.toISOString(),
    } as UploadUrlResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
