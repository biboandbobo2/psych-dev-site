/**
 * Cloud Function: biographyImport
 * Тонкая обёртка над общим pipeline (server/api/timelineBiographyPipeline.ts):
 * auth, Firestore-прогресс (biographyJobs/{jobId}), BYOK-учёт токенов.
 * Сама оркестрация шагов живёт в shared-модуле — единая с automation runtime.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

import { logger } from 'firebase-functions/v2';

import { WIKIPEDIA_HOST_PATTERN } from '../../server/api/timelineBiographyTypes.js';
import {
  runBiographyPipelineCore,
  type BiographyPipelineResult,
} from '../../server/api/timelineBiographyPipeline.js';
import { buildBiographyEvaluationMetrics } from '../../server/api/timelineBiographyMetrics.js';
import {
  callGeminiWithRetry,
  getGenAiClient,
  recordBiographyByokUsage,
} from './biography/helpers.js';

// ============================================================================
// INIT
// ============================================================================

if (getApps().length === 0) {
  initializeApp();
}

// Facts contain optional fields (age, month, etc.) that may be undefined.
// Firestore rejects undefined values by default.
getFirestore().settings({ ignoreUndefinedProperties: true });

const JOBS_COLLECTION = 'biographyJobs';

// ============================================================================
// Validation
// ============================================================================

function validateSourceUrl(body: Record<string, unknown>): string {
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  if (!sourceUrl) {
    throw Object.assign(new Error('Укажите ссылку на статью Wikipedia.'), { statusCode: 400 });
  }
  try {
    const hostname = new URL(sourceUrl).hostname;
    if (!WIKIPEDIA_HOST_PATTERN.test(hostname)) {
      throw Object.assign(new Error('Ссылка должна вести на Wikipedia.'), { statusCode: 400 });
    }
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    throw Object.assign(new Error('Некорректный URL.'), { statusCode: 400 });
  }
  return sourceUrl;
}

function normalizeError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (statusCode) return { statusCode, message: rawMessage };

  if (/quota|RESOURCE_EXHAUSTED|429/i.test(rawMessage)) return { statusCode: 429, message: 'Gemini временно недоступен из-за лимита запросов. Попробуйте позже.' };
  if (/PERMISSION_DENIED|API key not valid|invalid api key|forbidden/i.test(rawMessage)) return { statusCode: 403, message: 'Gemini API key недействителен.' };
  if (/JSON|Unexpected token|parse/i.test(rawMessage)) return { statusCode: 502, message: 'Gemini вернул некорректный ответ. Попробуйте ещё раз.' };
  return { statusCode: 500, message: `Не удалось собрать таймлайн: ${rawMessage}` };
}

// ============================================================================
// Auth (verify Firebase Auth token from Authorization header)
// ============================================================================

async function verifyAuth(req: { headers: Record<string, string | string[] | undefined> }): Promise<{ uid: string; email: string }> {
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    throw Object.assign(new Error('Authorization header required'), { statusCode: 401 });
  }
  const decoded = await getAuth().verifyIdToken(token);
  let email = decoded.email ?? '';
  if (!email) {
    try {
      const userRecord = await getAuth().getUser(decoded.uid);
      email = userRecord.email ?? '';
    } catch { /* optional */ }
  }
  return { uid: decoded.uid, email };
}

// ============================================================================
// MAIN PIPELINE (обёртка: Firestore job + BYOK учёт вокруг shared pipeline)
// ============================================================================

async function runFullBiographyPipeline(params: {
  sourceUrl: string;
  apiKey: string;
  uid: string;
  userEmail: string;
  canvasId: string;
  jobId?: string;
  /** True если использован user's BYOK ключ (а не server fallback) — учитывать токены в /profile. */
  isBYOK: boolean;
}): Promise<{
  jobId: string;
  subjectName: string;
  canvasName: string;
  timeline?: BiographyPipelineResult['timeline'];
  composition?: BiographyPipelineResult['composition'];
  meta: {
    factCount: number;
    model: string;
    rawTextChars: number;
    planDiagnostics?: BiographyPipelineResult['planDiagnostics'];
    timelineStats?: BiographyPipelineResult['timelineStats'];
    /** Lightweight quality summary for fast UI/log diagnostics without running timeline:eval CLI. */
    qualityMetrics?: {
      factsTotal: number;
      factsWithThemes: number;
      themesCovered: number;
      mainEvents: number;
      branches: number;
      branchEvents: number;
      genericLabels: number;
      emptyNotes: number;
    };
  };
}> {
  const db = getFirestore();
  const client = getGenAiClient(params.apiKey);

  // Накопление total Gemini tokens для BYOK usage tracking (отображается в /profile).
  let totalTokens = 0;

  // Create job document (use client-provided jobId for onSnapshot tracking)
  const jobRef = params.jobId
    ? db.collection(JOBS_COLLECTION).doc(params.jobId)
    : db.collection(JOBS_COLLECTION).doc();
  await jobRef.set({
    userId: params.uid,
    userEmail: params.userEmail,
    canvasId: params.canvasId,
    sourceUrl: params.sourceUrl,
    subjectName: '',
    status: 'running',
    progress: { step: 1, total: 6, label: 'Загрузка статьи из Wikipedia' },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updateJob = async (data: Record<string, unknown>) => {
    await jobRef.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  };

  // F3 (verifier): прогресс-записи не блокируют шаги pipeline, но идут строго
  // по порядку и дожидаются до финального updateJob — иначе stale progress
  // может записаться после status='done'.
  let progressWrites: Promise<void> = Promise.resolve();
  const queueProgressWrite = (data: Record<string, unknown>) => {
    progressWrites = progressWrites
      .then(() => updateJob(data))
      .catch((err) => logger.warn('[biographyImport] progress update failed', err));
  };

  try {
    const result = await runBiographyPipelineCore({
      sourceUrl: params.sourceUrl,
      deps: {
        callModel: (request, label) => callGeminiWithRetry(client, request as never, label),
        onTokens: (tokens) => {
          totalTokens += tokens;
        },
        onProgress: (step, total, label, detail) => {
          queueProgressWrite({ progress: { step, total, label, ...(detail ? { detail } : {}) } });
        },
        onStage: async (stage, data) => {
          if (stage === 'extraction') {
            await updateJob({
              subjectName: data.subjectName,
              status: 'step1_done',
              'step1.facts': data.facts,
              'step1.model': 'gemini-2.5-flash',
              'step1.rawTextChars': data.rawTextChars,
              'step1.extract': data.extract,
            });
          } else if (stage === 'gap-filling') {
            await updateJob({ status: 'step2_done', 'step2.facts': data.facts });
          } else if (stage === 'redaktura') {
            await updateJob({ status: 'step3_done', 'step3.facts': data.facts });
          }
        },
        log: (message, data) => logger.info(`[biographyImport] ${message}`, data),
        logError: (message, data) => logger.error(`[biographyImport] ${message}`, data),
      },
    });

    let qualityMetrics;
    if (result.plan && result.timeline) {
      const evalMetrics = buildBiographyEvaluationMetrics({
        facts: result.facts,
        plan: result.plan,
        timeline: result.timeline,
      });
      qualityMetrics = {
        factsTotal: evalMetrics.facts.total,
        factsWithThemes: evalMetrics.facts.withThemes,
        themesCovered: Object.keys(evalMetrics.facts.themeCoverage).length,
        mainEvents: evalMetrics.plan.mainEvents,
        branches: evalMetrics.plan.branches,
        branchEvents: evalMetrics.plan.branchEvents,
        genericLabels: evalMetrics.plan.genericLabels,
        emptyNotes: evalMetrics.plan.emptyNotes,
      };
    }

    const meta = {
      factCount: result.facts.length,
      model: `${result.factsModel} -> annotation -> redaktura -> composition -> render`,
      rawTextChars: result.rawTextChars,
      planDiagnostics: result.planDiagnostics,
      timelineStats: result.timelineStats,
      qualityMetrics,
    };

    await progressWrites;
    await updateJob({
      status: 'done',
      step4: { timeline: result.timeline, composition: result.composition, canvasName: result.subjectName, meta },
    });

    // BYOK usage tracking — учитываем потраченные tokens в /profile под action `biography:import`.
    // Записываем только если использован user's BYOK ключ (не server fallback).
    if (params.isBYOK) {
      await recordBiographyByokUsage(params.uid, totalTokens);
    }

    logger.info('[biographyImport] complete', {
      jobId: jobRef.id,
      nodes: result.timelineStats?.nodes,
      totalTokens,
      byokTracked: params.isBYOK,
    });

    return {
      jobId: jobRef.id,
      subjectName: result.subjectName,
      canvasName: result.subjectName,
      timeline: result.timeline,
      composition: result.composition,
      meta,
    };
  } catch (error) {
    await progressWrites;
    await updateJob({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

export const biographyImport = onRequest(
  {
    timeoutSeconds: 600,
    memory: '2GiB',
    region: 'europe-west1',
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Api-Key');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      const { uid, email } = await verifyAuth(req);
      const sourceUrl = validateSourceUrl(req.body as Record<string, unknown>);
      const canvasId = typeof req.body?.canvasId === 'string' ? req.body.canvasId : '';
      // BYOK: user's key from header takes priority over server secret
      const userKey = req.headers['x-gemini-api-key'];
      const trimmedUserKey = typeof userKey === 'string' ? userKey.trim() : '';
      const apiKey = trimmedUserKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ ok: false, error: 'GEMINI_API_KEY not configured' });
        return;
      }
      const isBYOK = Boolean(trimmedUserKey);

      const clientJobId = typeof req.body?.jobId === 'string' ? req.body.jobId : undefined;
      const result = await runFullBiographyPipeline({ sourceUrl, apiKey, uid, userEmail: email, canvasId, jobId: clientJobId, isBYOK });

      res.status(200).json({
        ok: true,
        jobId: result.jobId,
        subjectName: result.subjectName,
        canvasName: result.canvasName,
        timeline: result.timeline,
        meta: result.meta,
      });
    } catch (error) {
      logger.error('[biographyImport] handler error', error);
      const { statusCode, message } = normalizeError(error);
      res.status(statusCode).json({
        ok: false,
        error: message,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
