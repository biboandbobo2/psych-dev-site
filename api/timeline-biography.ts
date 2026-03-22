import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { debugError, debugLog } from '../src/lib/debug.js';
import { resolveLectureGeminiApiKey, setLectureApiCorsHeaders, verifyLectureApiAuth } from '../server/api/lectureApiRuntime.js';
import {
  normalizeBiographyApiError,
  runBiographyStep1,
  runBiographyStep2,
  runBiographyStep3,
  validateBiographyImportRequest,
} from '../server/api/timelineBiography.js';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  }
  const sa = JSON.parse(json);
  initializeApp({ credential: cert(sa) });
}

const JOBS_COLLECTION = 'biographyJobs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setLectureApiCorsHeaders(req, res);

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

    const authResult = await verifyLectureApiAuth(req);
    if (!authResult.valid) {
      res.status(401).json({ ok: false, error: authResult.error, code: authResult.code });
      return;
    }
    const uid = authResult.uid;

    const apiKey = resolveLectureGeminiApiKey(req);
    const step = Number(req.body?.step) || 1;
    const db = getFirestore();

    if (step === 1) {
      const { sourceUrl } = validateBiographyImportRequest(req.body);
      const canvasId = req.body?.canvasId ?? '';

      // Get user email for diagnostics
      let userEmail = '';
      try {
        const userRecord = await getAuth().getUser(uid);
        userEmail = userRecord.email ?? '';
      } catch {
        // email is optional for diagnostics
      }

      debugLog('[timeline-biography] step 1 start', { sourceUrl, uid });
      const result = await runBiographyStep1({ sourceUrl, apiKey });

      // Save to Firestore
      const jobRef = db.collection(JOBS_COLLECTION).doc();
      await jobRef.set({
        userId: uid,
        userEmail,
        canvasId,
        sourceUrl,
        subjectName: result.subjectName,
        status: 'step1_done',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        step1: {
          facts: result.facts,
          model: result.model,
          rawTextChars: result.rawTextChars,
        },
      });

      debugLog('[timeline-biography] step 1 done', { jobId: jobRef.id, facts: result.facts.length });
      res.status(200).json({
        ok: true,
        jobId: jobRef.id,
        subjectName: result.subjectName,
        factsCount: result.facts.length,
        rawTextChars: result.rawTextChars,
        model: result.model,
      });

    } else if (step === 2) {
      const jobId = req.body?.jobId;
      if (!jobId) {
        res.status(400).json({ ok: false, error: 'jobId is required for step 2' });
        return;
      }

      const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
      const jobDoc = await jobRef.get();
      if (!jobDoc.exists) {
        res.status(404).json({ ok: false, error: 'Job not found' });
        return;
      }
      const job = jobDoc.data()!;
      if (job.userId !== uid) {
        res.status(403).json({ ok: false, error: 'Access denied' });
        return;
      }
      if (job.status !== 'step1_done') {
        res.status(400).json({ ok: false, error: `Invalid job status: ${job.status}. Expected step1_done.` });
        return;
      }

      debugLog('[timeline-biography] step 2 start', { jobId, facts: job.step1.facts.length });
      const result = await runBiographyStep2({
        apiKey,
        subjectName: job.subjectName,
        facts: job.step1.facts,
      });

      await jobRef.update({
        status: 'step2_done',
        updatedAt: FieldValue.serverTimestamp(),
        step2: { facts: result.facts },
      });

      debugLog('[timeline-biography] step 2 done', { jobId, facts: result.facts.length });
      res.status(200).json({
        ok: true,
        jobId,
        factsCount: result.facts.length,
      });

    } else if (step === 3) {
      const jobId = req.body?.jobId;
      if (!jobId) {
        res.status(400).json({ ok: false, error: 'jobId is required for step 3' });
        return;
      }

      const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
      const jobDoc = await jobRef.get();
      if (!jobDoc.exists) {
        res.status(404).json({ ok: false, error: 'Job not found' });
        return;
      }
      const job = jobDoc.data()!;
      if (job.userId !== uid) {
        res.status(403).json({ ok: false, error: 'Access denied' });
        return;
      }
      if (job.status !== 'step2_done') {
        res.status(400).json({ ok: false, error: `Invalid job status: ${job.status}. Expected step2_done.` });
        return;
      }

      debugLog('[timeline-biography] step 3 start', { jobId, facts: job.step2.facts.length });
      const result = await runBiographyStep3({
        apiKey,
        subjectName: job.subjectName,
        facts: job.step2.facts,
        sourceUrl: job.sourceUrl,
        rawTextChars: job.step1.rawTextChars,
        factsModel: job.step1.model,
      });

      await jobRef.update({
        status: 'done',
        updatedAt: FieldValue.serverTimestamp(),
        step3: {
          timeline: result.timeline,
          composition: result.composition,
          canvasName: result.canvasName,
          meta: {
            factCount: result.meta.factCount,
            model: result.meta.model,
            rawTextChars: result.meta.rawTextChars,
            planDiagnostics: result.meta.planDiagnostics,
            timelineStats: result.meta.timelineStats,
          },
        },
      });

      debugLog('[timeline-biography] step 3 done', { jobId, nodes: result.meta.timelineStats?.nodes });
      res.status(200).json({
        ok: true,
        jobId,
        canvasName: result.canvasName,
        subjectName: result.subjectName,
        timeline: result.timeline,
        meta: result.meta,
      });

    } else {
      res.status(400).json({ ok: false, error: `Invalid step: ${step}. Expected 1, 2, or 3.` });
    }
  } catch (error) {
    debugError('[timeline-biography] handler error', error);
    const { statusCode, message } = normalizeBiographyApiError(error);
    const rawMessage = error instanceof Error ? error.message : String(error);
    res.status(statusCode).json({
      ok: false,
      error: message,
      detail: rawMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
