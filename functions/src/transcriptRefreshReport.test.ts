import { describe, expect, it } from "vitest";
import { formatTranscriptRefreshTelegramReport } from "./transcriptRefreshReport.js";
import { createEmptyTranscriptRefreshSummary } from "./transcriptRefreshJob.js";

describe("formatTranscriptRefreshTelegramReport", () => {
  it("renders summary counts and escaped errors", () => {
    const summary = createEmptyTranscriptRefreshSummary();
    summary.scannedVideoCount = 45;
    summary.candidateCount = 3;
    summary.processedCount = 3;
    summary.availableCount = 1;
    summary.unavailableCount = 2;
    summary.transcriptSyncedCount = 1;
    summary.searchIndexSyncedCount = 1;
    summary.lectureRagSyncedCount = 1;
    summary.lectureRagSkippedCount = 0;
    summary.errorSummary = ["abc123: TRANSCRIPT_NOT_AVAILABLE", "x_y*z: UNKNOWN"];

    const report = formatTranscriptRefreshTelegramReport(summary, {
      batchSize: 25,
      jobName: "weeklyRefresh",
      runId: "run-1",
      status: "completed",
    });

    expect(report).toContain("Weekly Transcript Refresh");
    expect(report).toContain("Scanned videos: *45*");
    expect(report).toContain("Candidates: *3*");
    expect(report).toContain("Transcript synced: *1*");
    expect(report).toContain("Search index synced: *1*");
    expect(report).toContain("Lecture AI synced: *1*");
    expect(report).toContain("• x\\_y\\*z: UNKNOWN");
  });
});
