import type { TranscriptRefreshSummary } from "./transcriptRefreshJob.js";

function escapeMarkdown(value: string) {
  return value.replace(/([_*`\[\]])/g, "\\$1");
}

export function formatTranscriptRefreshTelegramReport(
  summary: TranscriptRefreshSummary,
  context: {
    batchSize: number;
    jobName: string;
    runId: string | null;
    status: "completed" | "failed";
    errorMessage?: string | null;
  }
) {
  const lines = [
    `${context.status === "completed" ? "🎬" : "❌"} *Weekly Transcript Refresh*`,
    "",
    `Job: \`${context.jobName}\``,
    `Run: \`${context.runId ?? "n/a"}\``,
    `Batch size: *${context.batchSize}*`,
    `Scanned videos: *${summary.scannedVideoCount}*`,
    `Candidates: *${summary.candidateCount}*`,
    `Processed: *${summary.processedCount}*`,
    `Available: *${summary.availableCount}*`,
    `Unavailable: *${summary.unavailableCount}*`,
    `Failed: *${summary.failedCount}*`,
    `Skipped: *${summary.skippedCount}*`,
    "",
    "*Pipeline:*",
    `• Transcript synced: *${summary.transcriptSyncedCount}*`,
    `• Search index synced: *${summary.searchIndexSyncedCount}*`,
    `• Lecture AI synced: *${summary.lectureRagSyncedCount}*`,
    `• Lecture AI skipped: *${summary.lectureRagSkippedCount}*`,
  ];

  if (context.errorMessage) {
    lines.push("", `Error: ${escapeMarkdown(context.errorMessage)}`);
  }

  if (summary.errorSummary.length) {
    lines.push("", "*Errors:*");
    summary.errorSummary.slice(0, 8).forEach((errorLine) => {
      lines.push(`• ${escapeMarkdown(errorLine)}`);
    });
  }

  return lines.join("\n");
}
