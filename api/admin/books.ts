/**
 * POST/GET /api/admin/books
 * Unified endpoint for all admin book operations
 * Actions: list, create, manage, startIngestion, uploadUrl, jobStatus
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { Storage } from '@google-cloud/storage';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';
const BOOK_COLLECTIONS = { books: 'books', chunks: 'book_chunks', jobs: 'ingestion_jobs' } as const;
const BOOK_STORAGE_PATHS = { raw: (bookId: string) => `books/raw/${bookId}/original.pdf` } as const;
const MAX_BOOK_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  const sa = JSON.parse(json);
  initializeApp({
    credential: cert(sa),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`,
  });
}

async function verifyAuth(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, error: 'Missing authorization', code: 'UNAUTHORIZED' } as const;
  const token = authHeader.slice(7);
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const email = decodedToken.email || '';
    const role = decodedToken.role as string | undefined;
    if (email !== SUPER_ADMIN_EMAIL && role !== 'super-admin') {
      return { valid: false, error: 'Insufficient permissions', code: 'FORBIDDEN' } as const;
    }
    return { valid: true, uid: decodedToken.uid, email } as const;
  } catch {
    return { valid: false, error: 'Invalid token', code: 'UNAUTHORIZED' } as const;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    initFirebaseAdmin();
    const action = req.query.action as string || req.body?.action as string || '';

    // GET endpoints: list, jobStatus
    if (req.method === 'GET') {
      const authResult = await verifyAuth(req);
      if (!authResult.valid) {
        res.status(authResult.code === 'FORBIDDEN' ? 403 : 401).json({ ok: false, error: authResult.error });
        return;
      }

      const db = getFirestore();

      // LIST
      if (action === 'list') {
        const snapshot = await db.collection(BOOK_COLLECTIONS.books).orderBy('createdAt', 'desc').get();
        const books = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title || '',
            authors: d.authors || [],
            language: d.language || 'ru',
            year: d.year ?? null,
            tags: d.tags || [],
            status: d.status || 'draft',
            active: d.active ?? false,
            chunksCount: d.chunksCount ?? null,
            createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          };
        });
        res.status(200).json({ ok: true, books });
        return;
      }

      // JOB STATUS (GET)
      if (action === 'jobStatus') {
        const jobId = (req.query.jobId as string) || '';
        if (!jobId) {
          res.status(400).json({ ok: false, error: 'jobId required' });
          return;
        }

        const jobRef = db.collection(BOOK_COLLECTIONS.jobs).doc(jobId);
        const jobDoc = await jobRef.get();

        if (!jobDoc.exists) {
          res.status(404).json({ ok: false, error: 'Job not found' });
          return;
        }

        const jobData = jobDoc.data()!;
        const progress = jobData.progress || { done: 0, total: 0 };
        const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

        const STEP_LABELS: Record<string, string> = {
          download: 'Загрузка PDF',
          extract: 'Извлечение текста',
          chunk: 'Разбиение на части',
          embed: 'Создание эмбеддингов',
          save: 'Сохранение',
        };

        res.status(200).json({
          ok: true,
          job: {
            id: jobDoc.id,
            bookId: jobData.bookId,
            status: jobData.status,
            step: jobData.step,
            stepLabel: STEP_LABELS[jobData.step] || jobData.step,
            progress,
            progressPercent,
            startedAt: jobData.startedAt?.toDate?.()?.toISOString?.(),
            finishedAt: jobData.finishedAt?.toDate?.()?.toISOString?.() || null,
            logs: jobData.logs || [],
            error: jobData.error || null,
          },
        });
        return;
      }

      res.status(400).json({ ok: false, error: 'Invalid GET action' });
      return;
    }

    // All other actions require POST
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const authResult = await verifyAuth(req);
    if (!authResult.valid) {
      res.status(authResult.code === 'FORBIDDEN' ? 403 : 401).json({ ok: false, error: authResult.error });
      return;
    }

    const db = getFirestore();
    const body = req.body as Record<string, unknown>;

    // CREATE
    if (action === 'create') {
      const title = typeof body?.title === 'string' ? body.title.trim() : '';
      const authors = Array.isArray(body?.authors) ? body.authors.filter((a): a is string => typeof a === 'string') : [];
      const language = typeof body?.language === 'string' ? body.language : 'ru';
      const year = typeof body?.year === 'number' ? body.year : undefined;
      const tags = Array.isArray(body?.tags) ? body.tags : [];

      if (!title || authors.length === 0) {
        res.status(400).json({ ok: false, error: 'Title and authors required' });
        return;
      }

      const bookRef = db.collection(BOOK_COLLECTIONS.books).doc();
      const now = Timestamp.now();

      await bookRef.set({
        id: bookRef.id,
        title,
        authors,
        language,
        year: year ?? null,
        tags,
        status: 'draft',
        active: false,
        chunksCount: null,
        errors: [],
        createdAt: now,
        updatedAt: now,
      });

      res.status(200).json({ ok: true, bookId: bookRef.id });
      return;
    }

    // MANAGE (delete, toggleActive)
    if (action === 'manage') {
      const subAction = typeof body?.subAction === 'string' ? body.subAction : '';
      const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : '';

      if (!bookId) {
        res.status(400).json({ ok: false, error: 'bookId required' });
        return;
      }

      const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
      const bookDoc = await bookRef.get();

      if (!bookDoc.exists) {
        res.status(404).json({ ok: false, error: 'Book not found' });
        return;
      }

      if (subAction === 'toggleActive') {
        const currentActive = bookDoc.data()?.active ?? false;
        const newActive = !currentActive;
        await bookRef.update({ active: newActive, updatedAt: Timestamp.now() });
        res.status(200).json({ ok: true, active: newActive });
      } else if (subAction === 'delete') {
        const chunksSnap = await db.collection(BOOK_COLLECTIONS.chunks).where('bookId', '==', bookId).get();
        const chunksBatch = db.batch();
        chunksSnap.docs.forEach((doc) => chunksBatch.delete(doc.ref));
        await chunksBatch.commit();

        const jobsSnap = await db.collection(BOOK_COLLECTIONS.jobs).where('bookId', '==', bookId).get();
        const jobsBatch = db.batch();
        jobsSnap.docs.forEach((doc) => jobsBatch.delete(doc.ref));
        await jobsBatch.commit();

        let fileDeleted = false;
        try {
          const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
          const storage = new Storage({ projectId: sa.project_id, credentials: sa });
          const bucket = process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`;
          await storage.bucket(bucket).file(BOOK_STORAGE_PATHS.raw(bookId)).delete();
          fileDeleted = true;
        } catch {}

        await bookRef.delete();
        res.status(200).json({ ok: true, deleted: { book: true, chunks: chunksSnap.size, jobs: jobsSnap.size, file: fileDeleted } });
      } else {
        res.status(400).json({ ok: false, error: 'Invalid subAction' });
      }
      return;
    }

    // UPLOAD URL
    if (action === 'uploadUrl') {
      const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : '';
      const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
      const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : 0;

      if (!bookId || contentType !== 'application/pdf') {
        res.status(400).json({ ok: false, error: 'Invalid request' });
        return;
      }

      if (fileSize > MAX_BOOK_FILE_SIZE) {
        res.status(400).json({ ok: false, error: 'File too large' });
        return;
      }

      const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
      const bookDoc = await bookRef.get();

      if (!bookDoc.exists) {
        res.status(404).json({ ok: false, error: 'Book not found' });
        return;
      }

      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`;

      // Use direct Storage initialization with createResumableUpload (not getSignedUrl!)
      const storage = new Storage({
        projectId: sa.project_id,
        credentials: sa
      });
      const bucket = storage.bucket(bucketName);
      const storagePath = BOOK_STORAGE_PATHS.raw(bookId);
      const file = bucket.file(storagePath);

      // Create resumable upload URI with CORS origin
      const origin = req.headers.origin || '*';
      const [uploadUrl] = await file.createResumableUpload({
        origin,
        metadata: {
          contentType: 'application/pdf',
        },
      });

      await bookRef.update({ updatedAt: Timestamp.now() });

      res.status(200).json({ ok: true, uploadUrl, storagePath });
      return;
    }

    // START INGESTION
    if (action === 'startIngestion') {
      const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : '';

      if (!bookId) {
        res.status(400).json({ ok: false, error: 'bookId required' });
        return;
      }

      const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
      const bookDoc = await bookRef.get();

      if (!bookDoc.exists) {
        res.status(404).json({ ok: false, error: 'Book not found' });
        return;
      }

      const bookData = bookDoc.data();

      if (bookData?.status === 'processing') {
        res.status(400).json({ ok: false, error: 'Already processing' });
        return;
      }

      if (bookData?.status === 'ready') {
        res.status(400).json({ ok: false, error: 'Already processed' });
        return;
      }

      const storage = getStorage();
      const bucket = storage.bucket();
      const file = bucket.file(BOOK_STORAGE_PATHS.raw(bookId));
      const [exists] = await file.exists();

      if (!exists) {
        res.status(400).json({ ok: false, error: 'PDF not uploaded' });
        return;
      }

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

      await bookRef.update({
        status: 'processing',
        lastJobId: jobId,
        errors: [],
        updatedAt: now,
      });

      const cloudFunctionUrl = process.env.INGEST_BOOK_FUNCTION_URL;

      if (cloudFunctionUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          await fetch(cloudFunctionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, jobId }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
        } catch {}
      } else {
        await jobRef.update({
          logs: ['Job created', 'Warning: INGEST_BOOK_FUNCTION_URL not configured'],
        });
      }

      res.status(200).json({ ok: true, jobId, message: 'Ingestion started' });
      return;
    }

    // UPDATE METADATA
    if (action === 'update') {
      const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : '';
      if (!bookId) {
        res.status(400).json({ ok: false, error: 'bookId required' });
        return;
      }

      const bookRef = db.collection(BOOK_COLLECTIONS.books).doc(bookId);
      const bookDoc = await bookRef.get();

      if (!bookDoc.exists) {
        res.status(404).json({ ok: false, error: 'Book not found' });
        return;
      }

      const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };

      // Title
      if (typeof body?.title === 'string' && body.title.trim()) {
        updates.title = body.title.trim();
      }

      // Authors
      if (Array.isArray(body?.authors) && body.authors.length > 0) {
        const authors = body.authors.filter((a): a is string => typeof a === 'string' && a.trim().length > 0);
        if (authors.length > 0) {
          updates.authors = authors;
        }
      }

      // Year
      if (body?.year !== undefined) {
        if (body.year === null) {
          updates.year = null;
        } else if (typeof body.year === 'number' && body.year >= 1800 && body.year <= new Date().getFullYear() + 1) {
          updates.year = body.year;
        }
      }

      // Language
      if (typeof body?.language === 'string' && ['ru', 'en', 'de', 'fr', 'es'].includes(body.language)) {
        updates.language = body.language;
      }

      // Tags
      if (Array.isArray(body?.tags)) {
        updates.tags = body.tags.filter((t): t is string => typeof t === 'string');
      }

      await bookRef.update(updates);
      res.status(200).json({ ok: true, updated: Object.keys(updates).filter(k => k !== 'updatedAt') });
      return;
    }

    res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ ok: false, error: message });
  }
}
