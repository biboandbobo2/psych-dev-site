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
  runBiographyStep4,
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
      const slice = Number(req.body?.slice) || 0;
      const jobId = req.body?.jobId as string | undefined;

      if (slice === 0) {
        // First slice: fetch Wikipedia + extract slice 0
        const { sourceUrl } = validateBiographyImportRequest(req.body);
        const canvasId = req.body?.canvasId ?? '';

        let userEmail = '';
        try {
          const userRecord = await getAuth().getUser(uid);
          userEmail = userRecord.email ?? '';
        } catch { /* optional */ }

        debugLog('[timeline-biography] step 1 slice 0 start', { sourceUrl, uid });
        const result = await runBiographyStep1({ sourceUrl, apiKey, slice: 0 });

        const jobRef = db.collection(JOBS_COLLECTION).doc();
        const status = result.slicesDone >= result.slicesTotal ? 'step1_done' : 'step1_extracting';
        await jobRef.set({
          userId: uid,
          userEmail,
          canvasId,
          sourceUrl,
          subjectName: result.subjectName,
          status,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          step1: {
            facts: result.facts,
            model: result.model,
            rawTextChars: result.rawTextChars,
            extract: result.extract,
          },
        });

        debugLog('[timeline-biography] step 1 slice 0 done', {
          jobId: jobRef.id, facts: result.facts.length, slices: `${result.slicesDone}/${result.slicesTotal}`,
        });
        res.status(200).json({
          ok: true,
          jobId: jobRef.id,
          subjectName: result.subjectName,
          factsCount: result.facts.length,
          rawTextChars: result.rawTextChars,
          model: result.model,
          slicesTotal: result.slicesTotal,
          slicesDone: result.slicesDone,
        });
      } else {
        // Subsequent slices: read existing data, extract next slice
        if (!jobId) {
          res.status(400).json({ ok: false, error: 'jobId is required for slice > 0' });
          return;
        }
        const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) { res.status(404).json({ ok: false, error: 'Job not found' }); return; }
        const job = jobDoc.data()!;
        if (job.userId !== uid) { res.status(403).json({ ok: false, error: 'Access denied' }); return; }

        debugLog('[timeline-biography] step 1 slice start', { jobId, slice });
        const result = await runBiographyStep1({
          sourceUrl: job.sourceUrl,
          apiKey,
          slice,
          existing: {
            subjectName: job.subjectName,
            extract: job.step1.extract,
            rawTextChars: job.step1.rawTextChars,
            facts: job.step1.facts,
            model: job.step1.model,
          },
        });

        const status = result.slicesDone >= result.slicesTotal ? 'step1_done' : 'step1_extracting';
        await jobRef.update({
          status,
          updatedAt: FieldValue.serverTimestamp(),
          'step1.facts': result.facts,
          'step1.model': result.model,
        });

        debugLog('[timeline-biography] step 1 slice done', {
          jobId, facts: result.facts.length, slices: `${result.slicesDone}/${result.slicesTotal}`,
        });
        res.status(200).json({
          ok: true,
          jobId,
          subjectName: result.subjectName,
          factsCount: result.facts.length,
          slicesTotal: result.slicesTotal,
          slicesDone: result.slicesDone,
        });
      }

    } else if (step >= 2 && step <= 4) {
      const jobId = req.body?.jobId;
      if (!jobId) {
        res.status(400).json({ ok: false, error: `jobId is required for step ${step}` });
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

      const expectedStatus = `step${step - 1}_done`;
      if (job.status !== expectedStatus) {
        res.status(400).json({ ok: false, error: `Invalid job status: ${job.status}. Expected ${expectedStatus}.` });
        return;
      }

      if (step === 2) {
        // Gap-filling
        debugLog('[timeline-biography] step 2 start', { jobId, facts: job.step1.facts.length });
        const result = await runBiographyStep2({
          apiKey,
          subjectName: job.subjectName,
          facts: job.step1.facts,
          extract: job.step1.extract,
        });
        await jobRef.update({
          status: 'step2_done',
          updatedAt: FieldValue.serverTimestamp(),
          step2: { facts: result.facts },
        });
        debugLog('[timeline-biography] step 2 done', { jobId, facts: result.facts.length });
        res.status(200).json({ ok: true, jobId, factsCount: result.facts.length });

      } else if (step === 3) {
        // Annotation + redaktura
        const inputFacts = job.step2?.facts ?? job.step1.facts;
        debugLog('[timeline-biography] step 3 start', { jobId, facts: inputFacts.length });
        const result = await runBiographyStep3({
          apiKey,
          subjectName: job.subjectName,
          facts: inputFacts,
        });
        await jobRef.update({
          status: 'step3_done',
          updatedAt: FieldValue.serverTimestamp(),
          step3: { facts: result.facts },
        });
        debugLog('[timeline-biography] step 3 done', { jobId, facts: result.facts.length });
        res.status(200).json({ ok: true, jobId, factsCount: result.facts.length });

      } else {
        // step === 4: Composition + render
        const inputFacts = job.step3?.facts ?? job.step2?.facts ?? job.step1.facts;
        debugLog('[timeline-biography] step 4 start', { jobId, facts: inputFacts.length });
        const result = await runBiographyStep4({
          apiKey,
          subjectName: job.subjectName,
          facts: inputFacts,
          sourceUrl: job.sourceUrl,
          rawTextChars: job.step1.rawTextChars,
          factsModel: job.step1.model,
        });
        await jobRef.update({
          status: 'done',
          updatedAt: FieldValue.serverTimestamp(),
          step4: {
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
        debugLog('[timeline-biography] step 4 done', { jobId, nodes: result.meta.timelineStats?.nodes });
        res.status(200).json({
          ok: true,
          jobId,
          canvasName: result.canvasName,
          subjectName: result.subjectName,
          timeline: result.timeline,
          meta: result.meta,
        });
      }

    } else {
      res.status(400).json({ ok: false, error: `Invalid step: ${step}. Expected 1-4.` });
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
