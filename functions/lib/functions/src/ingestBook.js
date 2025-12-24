/**
 * Cloud Function: ingestBook
 * HTTP trigger для обработки книги:
 * 1. Скачать PDF из Storage
 * 2. Извлечь текст
 * 3. Разбить на чанки
 * 4. Получить эмбеддинги
 * 5. Записать в Firestore
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { parsePdf, isProbablyScan } from './lib/pdfParser.js';
import { chunkPages, DEFAULT_CHUNK_CONFIG } from './lib/chunker.js';
import { getEmbeddingsBatch } from './lib/embeddings.js';
import { debugLog, debugError } from './lib/debug.js';
// ============================================================================
// INIT
// ============================================================================
if (getApps().length === 0) {
    initializeApp({
        storageBucket: 'psych-dev-site-prod.firebasestorage.app',
    });
}
// ============================================================================
// CONSTANTS
// ============================================================================
const BOOKS_COLLECTION = 'books';
const CHUNKS_COLLECTION = 'book_chunks';
const JOBS_COLLECTION = 'ingestion_jobs';
// ============================================================================
// JOB HELPERS
// ============================================================================
async function updateJob(jobId, updates) {
    const db = getFirestore();
    const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
    const data = {};
    if (updates.status)
        data.status = updates.status;
    if (updates.step)
        data.step = updates.step;
    if (updates.progress)
        data.progress = updates.progress;
    if (updates.error)
        data.error = updates.error;
    if (updates.finishedAt)
        data.finishedAt = updates.finishedAt;
    if (updates.log) {
        data.logs = FieldValue.arrayUnion(updates.log);
    }
    await jobRef.update(data);
}
async function updateBook(bookId, updates) {
    const db = getFirestore();
    const bookRef = db.collection(BOOKS_COLLECTION).doc(bookId);
    await bookRef.update({
        ...updates,
        updatedAt: Timestamp.now(),
    });
}
// ============================================================================
// MAIN FUNCTION
// ============================================================================
export const ingestBook = onRequest({
    timeoutSeconds: 540, // 9 minutes
    memory: '2GiB',
    region: 'europe-west1',
    secrets: ['GEMINI_API_KEY'],
}, async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }
    const { bookId, jobId } = req.body;
    if (!bookId || !jobId) {
        res.status(400).json({ ok: false, error: 'bookId and jobId required' });
        return;
    }
    debugLog(`[ingestBook] Starting: bookId=${bookId}, jobId=${jobId}`);
    try {
        // Mark as running
        await updateJob(jobId, {
            status: 'running',
            step: 'download',
            log: 'Starting ingestion...',
        });
        // ============================================================
        // STEP 1: Download PDF
        // ============================================================
        await updateJob(jobId, { step: 'download', log: 'Downloading PDF...' });
        const storage = getStorage();
        const bucket = storage.bucket('psych-dev-site-prod.firebasestorage.app');
        const pdfPath = `books/raw/${bookId}/original.pdf`;
        const file = bucket.file(pdfPath);
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`PDF not found: ${pdfPath}`);
        }
        const [pdfBuffer] = await file.download();
        debugLog(`[ingestBook] Downloaded PDF: ${pdfBuffer.length} bytes`);
        await updateJob(jobId, {
            log: `Downloaded PDF (${Math.round(pdfBuffer.length / 1024)} KB)`,
        });
        // ============================================================
        // STEP 2: Extract text
        // ============================================================
        await updateJob(jobId, { step: 'extract', log: 'Extracting text...' });
        const parsed = await parsePdf(pdfBuffer);
        debugLog(`[ingestBook] Parsed ${parsed.totalPages} pages`);
        // Calculate total text length
        const totalChars = parsed.pages.reduce((sum, p) => sum + p.text.length, 0);
        const avgCharsPerPage = totalChars / parsed.totalPages;
        debugLog(`[ingestBook] Total text: ${totalChars} chars, avg per page: ${avgCharsPerPage.toFixed(0)}`);
        // Update book with page count
        await updateBook(bookId, { pageCount: parsed.totalPages });
        // Log extraction results with details
        await updateJob(jobId, {
            log: `Extracted text from ${parsed.totalPages} pages (${totalChars} chars, avg ${avgCharsPerPage.toFixed(0)}/page)`,
        });
        // Check for scan and warn
        if (isProbablyScan(parsed.pages)) {
            await updateJob(jobId, {
                log: `⚠️ Low text density detected - might be scanned PDF without OCR`,
            });
        }
        // ============================================================
        // STEP 3: Chunk
        // ============================================================
        await updateJob(jobId, { step: 'chunk', log: 'Creating chunks...' });
        let chunks;
        try {
            debugLog(`[ingestBook] About to chunk ${parsed.pages.length} pages`);
            chunks = chunkPages(parsed.pages, DEFAULT_CHUNK_CONFIG);
            debugLog(`[ingestBook] Chunking completed, got ${chunks.length} chunks`);
        }
        catch (chunkError) {
            const msg = chunkError instanceof Error ? chunkError.message : String(chunkError);
            debugError(`[ingestBook] Chunking failed: ${msg}`);
            await updateJob(jobId, { log: `Chunking error: ${msg}` });
            throw new Error(`Chunking failed: ${msg}`);
        }
        if (chunks.length === 0) {
            await updateJob(jobId, { log: 'Error: No chunks created' });
            throw new Error('No chunks created - PDF might be empty or unreadable');
        }
        await updateJob(jobId, {
            log: `Created ${chunks.length} chunks`,
            progress: { done: 0, total: chunks.length },
        });
        // ============================================================
        // STEP 4: Get embeddings
        // ============================================================
        await updateJob(jobId, { step: 'embed', log: 'Getting embeddings...' });
        let embeddings;
        try {
            const texts = chunks.map((c) => c.text);
            debugLog(`[ingestBook] About to get embeddings for ${texts.length} chunks`);
            embeddings = await getEmbeddingsBatch(texts, (done, total) => {
                // Update progress every 10 chunks
                if (done % 10 === 0 || done === total) {
                    updateJob(jobId, { progress: { done, total } }).catch(() => { });
                }
            });
            debugLog(`[ingestBook] Embeddings completed, got ${embeddings.length} vectors`);
        }
        catch (embedError) {
            const msg = embedError instanceof Error ? embedError.message : String(embedError);
            debugError(`[ingestBook] Embeddings failed: ${msg}`);
            await updateJob(jobId, { log: `Embeddings error: ${msg}` });
            throw new Error(`Embeddings failed: ${msg}`);
        }
        await updateJob(jobId, { log: `Got ${embeddings.length} embeddings` });
        // ============================================================
        // STEP 5: Save to Firestore
        // ============================================================
        await updateJob(jobId, { step: 'save', log: 'Saving chunks...' });
        const db = getFirestore();
        const now = Timestamp.now();
        // Use batched writes
        const BATCH_SIZE = 100;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const batchChunks = chunks.slice(i, i + BATCH_SIZE);
            const batchEmbeddings = embeddings.slice(i, i + BATCH_SIZE);
            for (let j = 0; j < batchChunks.length; j++) {
                const chunk = batchChunks[j];
                const embedding = batchEmbeddings[j];
                const chunkRef = db.collection(CHUNKS_COLLECTION).doc();
                batch.set(chunkRef, {
                    id: chunkRef.id,
                    bookId,
                    pageStart: chunk.pageStart,
                    pageEnd: chunk.pageEnd,
                    preview: chunk.preview,
                    textHash: chunk.textHash,
                    embedding: FieldValue.vector(embedding),
                    createdAt: now,
                });
            }
            await batch.commit();
            // Update progress
            await updateJob(jobId, {
                progress: { done: Math.min(i + BATCH_SIZE, chunks.length), total: chunks.length },
            });
        }
        debugLog(`[ingestBook] Saved ${chunks.length} chunks to Firestore`);
        // ============================================================
        // DONE
        // ============================================================
        await updateBook(bookId, {
            status: 'ready',
            chunksCount: chunks.length,
        });
        await updateJob(jobId, {
            status: 'done',
            log: `Completed: ${chunks.length} chunks indexed`,
            finishedAt: Timestamp.now(),
            progress: { done: chunks.length, total: chunks.length },
        });
        debugLog(`[ingestBook] Completed successfully`);
        res.status(200).json({ ok: true, chunksCount: chunks.length });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        debugError(`[ingestBook] Error: ${message}`);
        // Update job with error
        await updateJob(jobId, {
            status: 'error',
            error: { message, step: 'unknown', stack },
            log: `Error: ${message}`,
            finishedAt: Timestamp.now(),
        }).catch(() => { });
        // Update book status
        await updateBook(bookId, {
            status: 'error',
            errors: FieldValue.arrayUnion({
                step: 'ingestion',
                message,
                at: new Date().toISOString(),
            }),
        }).catch(() => { });
        res.status(500).json({ ok: false, error: message });
    }
});
