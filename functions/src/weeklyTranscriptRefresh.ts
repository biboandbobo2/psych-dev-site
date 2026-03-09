import * as functions from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ensureAdminApp, resolveAdminStorageBucket } from "./lib/adminApp.js";
import { sendTelegramMessage } from "./lib/telegram.js";
import { getTranscriptRefreshConfigFromEnv } from "./transcriptRefreshConfig.js";
import { collectTranscriptRefreshCandidates } from "./transcriptRefreshCandidates.js";
import {
  acquireTranscriptRefreshLock,
  createEmptyTranscriptRefreshSummary,
  finalizeTranscriptRefreshRun,
} from "./transcriptRefreshJob.js";
import { formatTranscriptRefreshTelegramReport } from "./transcriptRefreshReport.js";
import { upsertTranscript } from "../../shared/videoTranscripts/runner.js";

export async function runWeeklyTranscriptRefresh(deps?: {
  logger?: Pick<typeof functions.logger, "info" | "warn" | "error">;
  sendMessage?: (text: string) => Promise<unknown>;
}) {
  const logger = deps?.logger ?? functions.logger;
  const sendMessage = deps?.sendMessage ?? sendTelegramMessage;
  const config = getTranscriptRefreshConfigFromEnv();
  const app = ensureAdminApp();
  const db = getFirestore(app);
  const storage = getStorage(app);
  const bucketName = resolveAdminStorageBucket();
  const bucket = bucketName ? storage.bucket(bucketName) : null;
  const startedAt = Timestamp.now();
  const lock = await acquireTranscriptRefreshLock(
    db,
    config.jobName,
    "scheduled",
    startedAt,
    config.lockTtlMinutes
  );

  if (!lock.acquired) {
    logger.warn("Transcript refresh skipped: existing run lock is still active", {
      jobName: config.jobName,
    });
    return null;
  }

  const summary = createEmptyTranscriptRefreshSummary();

  try {
    const candidateResult = await collectTranscriptRefreshCandidates(
      db,
      startedAt,
      config.batchSize
    );
    summary.scannedVideoCount = candidateResult.scannedVideoCount;
    summary.candidateCount = candidateResult.candidateCount;

    for (const candidate of candidateResult.candidates) {
      const result = await upsertTranscript(
        { db, bucket },
        candidate.target,
        {
          dryRun: false,
          force: false,
          langs: config.langs,
        }
      );

      summary.processedCount += 1;

      if (result.status === "available") {
        summary.availableCount += 1;
        continue;
      }

      if (result.status === "skipped") {
        summary.skippedCount += 1;
        continue;
      }

      if (result.status === "unavailable") {
        summary.unavailableCount += 1;
      } else {
        summary.failedCount += 1;
      }

      summary.errorSummary.push(
        `${candidate.target.youtubeVideoId}: ${result.errorCode ?? "UNKNOWN"}`
      );
    }

    const finishedAt = Timestamp.now();
    await finalizeTranscriptRefreshRun(lock, finishedAt, summary, "completed", null);

    await sendMessage(
      formatTranscriptRefreshTelegramReport(summary, {
        batchSize: config.batchSize,
        jobName: config.jobName,
        runId: lock.runId,
        status: "completed",
      })
    );

    return summary;
  } catch (error: any) {
    const finishedAt = Timestamp.now();
    const errorMessage = error?.message || String(error);

    summary.failedCount += 1;
    summary.errorSummary.push(`job: ${errorMessage}`);
    await finalizeTranscriptRefreshRun(lock, finishedAt, summary, "failed", errorMessage);

    try {
      await sendMessage(
        formatTranscriptRefreshTelegramReport(summary, {
          batchSize: config.batchSize,
          jobName: config.jobName,
          runId: lock.runId,
          status: "failed",
          errorMessage,
        })
      );
    } catch (reportError: any) {
      logger.error("Failed to send transcript refresh Telegram report", {
        error: reportError?.message || String(reportError),
      });
    }

    throw error;
  }
}

const refreshConfig = getTranscriptRefreshConfigFromEnv();

export const weeklyTranscriptRefresh = functions.pubsub
  .schedule(refreshConfig.schedule)
  .timeZone(refreshConfig.timeZone)
  .onRun(async () => runWeeklyTranscriptRefresh());
