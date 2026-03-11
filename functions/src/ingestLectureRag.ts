import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { ensureAdminApp, resolveAdminStorageBucket } from "./lib/adminApp.js";
import { debugError, debugLog } from "./lib/debug.js";
import { getEmbeddingsBatch } from "./lib/embeddings.js";
import {
  collectTranscriptTargets,
  type TranscriptImportTarget,
} from "../../shared/videoTranscripts/index.js";
import {
  ingestLectureRagTarget,
  LECTURE_RAG_JOBS_COLLECTION,
} from "../../shared/lectureRag/index.js";

type LectureIngestionStep = "embed" | "resolve" | "save";

interface IngestLectureRagRequest {
  force?: boolean;
  jobId?: string;
  youtubeVideoId?: string;
}

function verifyLectureIngestSecret(req: { header: (name: string) => string | undefined }) {
  const configuredSecret = process.env.LECTURE_INGEST_SECRET;
  if (!configuredSecret) {
    return { valid: false, status: 500, error: "LECTURE_INGEST_SECRET is not configured" } as const;
  }

  const requestSecret = req.header("x-ingest-secret");
  if (requestSecret !== configuredSecret) {
    return { valid: false, status: 401, error: "Unauthorized" } as const;
  }

  return { valid: true } as const;
}

async function updateLectureJob(
  jobId: string,
  updates: {
    chunkCount?: number;
    error?: { message: string; step: LectureIngestionStep; stack?: string } | null;
    finishedAt?: FirebaseFirestore.Timestamp | null;
    lectureKeys?: string[];
    log?: string;
    progress?: { done: number; total: number };
    referenceCount?: number;
    status?: "done" | "error" | "queued" | "running";
    step?: LectureIngestionStep;
    youtubeVideoId?: string;
  }
) {
  const db = getFirestore();
  const jobRef = db.collection(LECTURE_RAG_JOBS_COLLECTION).doc(jobId);
  const payload: Record<string, unknown> = {};

  if (updates.chunkCount !== undefined) payload.chunkCount = updates.chunkCount;
  if (updates.error !== undefined) payload.error = updates.error;
  if (updates.finishedAt !== undefined) payload.finishedAt = updates.finishedAt;
  if (updates.lectureKeys !== undefined) payload.lectureKeys = updates.lectureKeys;
  if (updates.progress !== undefined) payload.progress = updates.progress;
  if (updates.referenceCount !== undefined) payload.referenceCount = updates.referenceCount;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.step !== undefined) payload.step = updates.step;
  if (updates.youtubeVideoId !== undefined) payload.youtubeVideoId = updates.youtubeVideoId;

  if (updates.log) {
    payload.logs = FieldValue.arrayUnion(updates.log);
  }

  await jobRef.set(payload, { merge: true });
}

async function ensureLectureJob(jobId: string, youtubeVideoId: string) {
  const db = getFirestore();
  const jobRef = db.collection(LECTURE_RAG_JOBS_COLLECTION).doc(jobId);
  const snapshot = await jobRef.get();

  if (snapshot.exists) {
    return;
  }

  await jobRef.set({
    id: jobId,
    youtubeVideoId,
    status: "queued",
    step: "resolve",
    progress: { done: 0, total: 0 },
    lectureKeys: [],
    logs: ["Job created"],
    error: null,
    chunkCount: 0,
    referenceCount: 0,
    startedAt: Timestamp.now(),
    finishedAt: null,
  });
}

async function resolveTranscriptTarget(youtubeVideoId: string) {
  const db = getFirestore();
  const targets = await collectTranscriptTargets(db);

  return (
    targets.find((target) => target.youtubeVideoId === youtubeVideoId) ?? null
  );
}

function buildResponseSummary(
  target: TranscriptImportTarget,
  jobId: string,
  result: Awaited<ReturnType<typeof ingestLectureRagTarget>>
) {
  return {
    chunkCount: result.chunkCount,
    jobId,
    lectureKeys: result.lectureKeys,
    processedReferences: result.processedReferences,
    skippedReferences: result.skippedReferences,
    status: result.status,
    youtubeVideoId: target.youtubeVideoId,
  };
}

export const ingestLectureRag = onRequest(
  {
    timeoutSeconds: 540,
    memory: "2GiB",
    region: "europe-west1",
    secrets: ["GEMINI_API_KEY", "LECTURE_INGEST_SECRET"],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type, X-Ingest-Secret");
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const authResult = verifyLectureIngestSecret(req);
    if (!authResult.valid) {
      res.status(authResult.status).json({ ok: false, error: authResult.error });
      return;
    }

    const app = ensureAdminApp();
    const storageBucket = app.options.storageBucket || resolveAdminStorageBucket();

    const body = (req.body ?? {}) as IngestLectureRagRequest;
    const youtubeVideoId = typeof body.youtubeVideoId === "string"
      ? body.youtubeVideoId.trim()
      : "";
    const force = body.force === true;
    const db = getFirestore();
    const jobId = typeof body.jobId === "string" && body.jobId.trim()
      ? body.jobId.trim()
      : db.collection(LECTURE_RAG_JOBS_COLLECTION).doc().id;

    if (!youtubeVideoId) {
      res.status(400).json({ ok: false, error: "youtubeVideoId required" });
      return;
    }

    await ensureLectureJob(jobId, youtubeVideoId);
    debugLog("[ingestLectureRag] Start", { force, jobId, youtubeVideoId });
    await updateLectureJob(jobId, {
      log: "Lecture ingestion started",
      status: "running",
      step: "resolve",
      youtubeVideoId,
    });

    try {
      const target = await resolveTranscriptTarget(youtubeVideoId);
      if (!target) {
        await updateLectureJob(jobId, {
          error: {
            message: `Transcript target not found for ${youtubeVideoId}`,
            step: "resolve",
          },
          finishedAt: Timestamp.now(),
          log: "Target not found in content collections",
          status: "error",
        });
        res.status(404).json({ ok: false, error: "Transcript target not found", jobId });
        return;
      }

      await updateLectureJob(jobId, {
        log: `Resolved ${target.references.length} lecture reference(s)`,
        progress: { done: 0, total: target.references.length },
        referenceCount: target.references.length,
        step: "embed",
      });

      const result = await ingestLectureRagTarget(
        {
          bucket: storageBucket
            ? getStorage(app).bucket(storageBucket)
            : null,
          db,
          getEmbeddingsBatch: async (texts, onProgress) =>
            getEmbeddingsBatch(texts, (done, total) => {
              onProgress?.(done, total);
              void updateLectureJob(jobId, {
                log: `Embedding progress ${done}/${total}`,
                progress: { done, total },
              });
            }),
        },
        target,
        {
          force,
          now: Timestamp.now(),
        }
      );

      if (result.status === "missing_transcript") {
        await updateLectureJob(jobId, {
          finishedAt: Timestamp.now(),
          log: "Transcript is unavailable for lecture ingestion",
          status: "error",
          step: "resolve",
        });
        res.status(409).json({
          ok: false,
          error: "Transcript unavailable",
          ...buildResponseSummary(target, jobId, result),
        });
        return;
      }

      await updateLectureJob(jobId, {
        chunkCount: result.chunkCount,
        finishedAt: Timestamp.now(),
        lectureKeys: result.lectureKeys,
        log:
          result.status === "skipped"
            ? "Lecture already ingested, skipped"
            : `Saved ${result.chunkCount} chunk(s) for ${result.processedReferences} lecture(s)`,
        progress: {
          done: result.processedReferences,
          total: target.references.length,
        },
        status: "done",
        step: "save",
      });

      res.status(200).json({
        ok: true,
        ...buildResponseSummary(target, jobId, result),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugError("[ingestLectureRag] Failed", message);

      await updateLectureJob(jobId, {
        error: {
          message,
          step: "embed",
          stack: error instanceof Error ? error.stack : undefined,
        },
        finishedAt: Timestamp.now(),
        log: `Lecture ingestion failed: ${message}`,
        status: "error",
      });

      res.status(500).json({ ok: false, error: message, jobId });
    }
  }
);
