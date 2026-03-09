import { Timestamp } from "firebase-admin/firestore";
import {
  VIDEO_TRANSCRIPT_JOB_RUNS_SUBCOLLECTION,
  VIDEO_TRANSCRIPT_JOBS_COLLECTION,
  type TranscriptRefreshJobDocShape,
  type TranscriptRefreshJobRunDocShape,
  type TranscriptRefreshJobStatus,
} from "../../shared/videoTranscripts/schema.js";

type AdminTimestamp = FirebaseFirestore.Timestamp;

export interface TranscriptRefreshSummary {
  processedCount: number;
  availableCount: number;
  unavailableCount: number;
  failedCount: number;
  skippedCount: number;
  scannedVideoCount: number;
  candidateCount: number;
  errorSummary: string[];
}

export interface TranscriptRefreshLock {
  acquired: boolean;
  jobRef: FirebaseFirestore.DocumentReference<TranscriptRefreshJobDocShape<AdminTimestamp>>;
  runRef: FirebaseFirestore.DocumentReference<TranscriptRefreshJobRunDocShape<AdminTimestamp>> | null;
  runId: string | null;
}

export function createEmptyTranscriptRefreshSummary(): TranscriptRefreshSummary {
  return {
    processedCount: 0,
    availableCount: 0,
    unavailableCount: 0,
    failedCount: 0,
    skippedCount: 0,
    scannedVideoCount: 0,
    candidateCount: 0,
    errorSummary: [],
  };
}

function buildRunningJobDoc(
  jobName: string,
  now: AdminTimestamp,
  expiresAt: AdminTimestamp,
  runId: string,
  trigger: "scheduled" | "manual"
): TranscriptRefreshJobDocShape<AdminTimestamp> {
  return {
    jobName,
    status: "running",
    startedAt: now,
    finishedAt: null,
    expiresAt,
    updatedAt: now,
    lastRunId: runId,
    lastTrigger: trigger,
    lastError: null,
  };
}

function buildRunningRunDoc(
  jobName: string,
  now: AdminTimestamp,
  trigger: "scheduled" | "manual"
): TranscriptRefreshJobRunDocShape<AdminTimestamp> {
  return {
    jobName,
    trigger,
    status: "running",
    startedAt: now,
    finishedAt: null,
    updatedAt: now,
    processedCount: 0,
    availableCount: 0,
    unavailableCount: 0,
    failedCount: 0,
    skippedCount: 0,
    scannedVideoCount: 0,
    candidateCount: 0,
    errorSummary: [],
  };
}

export async function acquireTranscriptRefreshLock(
  db: FirebaseFirestore.Firestore,
  jobName: string,
  trigger: "scheduled" | "manual",
  now: AdminTimestamp,
  lockTtlMinutes: number
): Promise<TranscriptRefreshLock> {
  const jobRef = db.collection(VIDEO_TRANSCRIPT_JOBS_COLLECTION).doc(jobName) as FirebaseFirestore.DocumentReference<
    TranscriptRefreshJobDocShape<AdminTimestamp>
  >;
  const runRef = jobRef.collection(VIDEO_TRANSCRIPT_JOB_RUNS_SUBCOLLECTION).doc() as FirebaseFirestore.DocumentReference<
    TranscriptRefreshJobRunDocShape<AdminTimestamp>
  >;
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + lockTtlMinutes * 60 * 1000
  );

  const acquired = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    const existing = snapshot.data();

    if (
      existing?.status === "running" &&
      existing.expiresAt instanceof Timestamp &&
      existing.expiresAt.toMillis() > now.toMillis()
    ) {
      return false;
    }

    transaction.set(jobRef, buildRunningJobDoc(jobName, now, expiresAt, runRef.id, trigger), {
      merge: true,
    });
    transaction.set(runRef, buildRunningRunDoc(jobName, now, trigger));
    return true;
  });

  return {
    acquired,
    jobRef,
    runId: acquired ? runRef.id : null,
    runRef: acquired ? runRef : null,
  };
}

export async function finalizeTranscriptRefreshRun(
  lock: TranscriptRefreshLock,
  now: AdminTimestamp,
  summary: TranscriptRefreshSummary,
  status: Exclude<TranscriptRefreshJobStatus, "running" | "idle">,
  errorMessage: string | null
) {
  if (!lock.runRef) {
    return;
  }

  await lock.jobRef.set(
    {
      status,
      finishedAt: now,
      expiresAt: null,
      updatedAt: now,
      lastError: errorMessage,
    },
    { merge: true }
  );

  await lock.runRef.set(
    {
      ...summary,
      status,
      finishedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
}
