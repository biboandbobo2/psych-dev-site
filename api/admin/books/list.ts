/**
 * GET /api/admin/books/list
 * Список всех книг (включая draft/processing/error)
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { BOOK_COLLECTIONS } from '../../../src/constants/books';

// ============================================================================
// TYPES
// ============================================================================

interface BookListItem {
  id: string;
  title: string;
  authors: string[];
  language: string;
  year: number | null;
  tags: string[];
  status: string;
  active: boolean;
  chunksCount: number | null;
  createdAt: string;
  updatedAt: string;
}

interface BookListResponse {
  ok: true;
  books: BookListItem[];
  total: number;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
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

    // Get query params
    const { status: filterStatus, limit: limitParam } = req.query;
    const limit = Math.min(Math.max(1, Number(limitParam) || 100), 500);

    // Build query
    const db = getFirestore();
    let query = db.collection(BOOK_COLLECTIONS.books).orderBy('createdAt', 'desc').limit(limit);

    // Optional status filter
    if (filterStatus && typeof filterStatus === 'string') {
      query = db
        .collection(BOOK_COLLECTIONS.books)
        .where('status', '==', filterStatus)
        .orderBy('createdAt', 'desc')
        .limit(limit);
    }

    const snapshot = await query.get();

    const books: BookListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        authors: data.authors || [],
        language: data.language || 'ru',
        year: data.year ?? null,
        tags: data.tags || [],
        status: data.status || 'draft',
        active: data.active ?? false,
        chunksCount: data.chunksCount ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || '',
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || '',
      };
    });

    res.status(200).json({
      ok: true,
      books,
      total: books.length,
    } as BookListResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
