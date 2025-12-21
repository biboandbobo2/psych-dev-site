/**
 * GET /api/admin/books/jobStatus
 * Получение статуса задачи обработки книги
 * Требует роль superadmin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { BOOK_COLLECTIONS, INGESTION_STEP_LABELS } from '../../../src/constants/books';

// ============================================================================
// TYPES
// ============================================================================

interface JobStatusResponse {
  ok: true;
  job: {
    id: string;
    bookId: string;
    status: string;
    step: string;
    stepLabel: string;
    progress: { done: number; total: number };
    progressPercent: number;
    startedAt: string;
    finishedAt: string | null;
    logs: string[];
    error: { message: string; step: string } | null;
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

    // Get jobId from query
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      res.status(400).json({ ok: false, error: 'jobId is required', code: 'VALIDATION_ERROR' } as ErrorResponse);
      return;
    }

    // Get job document
    const db = getFirestore();
    const jobRef = db.collection(BOOK_COLLECTIONS.jobs).doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      res.status(404).json({ ok: false, error: 'Job not found', code: 'NOT_FOUND' } as ErrorResponse);
      return;
    }

    const data = jobDoc.data()!;

    // Calculate progress percent
    const progress = data.progress || { done: 0, total: 0 };
    const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    // Get step label
    const step = data.step || 'download';
    const stepLabel = INGESTION_STEP_LABELS[step as keyof typeof INGESTION_STEP_LABELS] || step;

    res.status(200).json({
      ok: true,
      job: {
        id: jobDoc.id,
        bookId: data.bookId || '',
        status: data.status || 'queued',
        step,
        stepLabel,
        progress,
        progressPercent,
        startedAt: data.startedAt?.toDate?.()?.toISOString?.() || '',
        finishedAt: data.finishedAt?.toDate?.()?.toISOString?.() || null,
        logs: data.logs || [],
        error: data.error || null,
      },
    } as JobStatusResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message, code: 'INTERNAL_ERROR' } as ErrorResponse);
  }
}
