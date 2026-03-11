import { Timestamp } from "firebase-admin/firestore";
import { VIDEO_TRANSCRIPT_JOB_RUNS_SUBCOLLECTION, VIDEO_TRANSCRIPT_JOBS_COLLECTION, } from "../../shared/videoTranscripts/schema.js";
export function createEmptyTranscriptRefreshSummary() {
    return {
        processedCount: 0,
        availableCount: 0,
        unavailableCount: 0,
        failedCount: 0,
        skippedCount: 0,
        scannedVideoCount: 0,
        candidateCount: 0,
        transcriptSyncedCount: 0,
        searchIndexSyncedCount: 0,
        lectureRagSyncedCount: 0,
        lectureRagSkippedCount: 0,
        errorSummary: [],
    };
}
function buildRunningJobDoc(jobName, now, expiresAt, runId, trigger) {
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
function buildRunningRunDoc(jobName, now, trigger) {
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
        transcriptSyncedCount: 0,
        searchIndexSyncedCount: 0,
        lectureRagSyncedCount: 0,
        lectureRagSkippedCount: 0,
        errorSummary: [],
    };
}
export async function acquireTranscriptRefreshLock(db, jobName, trigger, now, lockTtlMinutes) {
    const jobRef = db.collection(VIDEO_TRANSCRIPT_JOBS_COLLECTION).doc(jobName);
    const runRef = jobRef.collection(VIDEO_TRANSCRIPT_JOB_RUNS_SUBCOLLECTION).doc();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + lockTtlMinutes * 60 * 1000);
    const acquired = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        const existing = snapshot.data();
        if (existing?.status === "running" &&
            existing.expiresAt instanceof Timestamp &&
            existing.expiresAt.toMillis() > now.toMillis()) {
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
export async function finalizeTranscriptRefreshRun(lock, now, summary, status, errorMessage) {
    if (!lock.runRef) {
        return;
    }
    await lock.jobRef.set({
        status,
        finishedAt: now,
        expiresAt: null,
        updatedAt: now,
        lastError: errorMessage,
    }, { merge: true });
    await lock.runRef.set({
        ...summary,
        status,
        finishedAt: now,
        updatedAt: now,
    }, { merge: true });
}
