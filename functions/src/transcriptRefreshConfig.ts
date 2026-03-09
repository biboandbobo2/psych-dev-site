import { WEEKLY_TRANSCRIPT_REFRESH_JOB } from "../../shared/videoTranscripts/schema.js";

function parsePositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
  label: string
) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer for ${label}: ${value}`);
  }

  return parsed;
}

export interface TranscriptRefreshConfig {
  jobName: string;
  langs: string[];
  batchSize: number;
  lockTtlMinutes: number;
  schedule: string;
  timeZone: string;
}

export function getTranscriptRefreshConfigFromEnv(): TranscriptRefreshConfig {
  return {
    jobName: WEEKLY_TRANSCRIPT_REFRESH_JOB,
    langs: (process.env.TRANSCRIPT_REFRESH_LANGS || "ru,en")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    batchSize: parsePositiveIntegerEnv(
      process.env.TRANSCRIPT_REFRESH_BATCH_SIZE,
      25,
      "TRANSCRIPT_REFRESH_BATCH_SIZE"
    ),
    lockTtlMinutes: parsePositiveIntegerEnv(
      process.env.TRANSCRIPT_REFRESH_LOCK_TTL_MINUTES,
      55,
      "TRANSCRIPT_REFRESH_LOCK_TTL_MINUTES"
    ),
    schedule: process.env.TRANSCRIPT_REFRESH_CRON || "0 9 * * 0",
    timeZone: process.env.TRANSCRIPT_REFRESH_TIME_ZONE || "Asia/Tbilisi",
  };
}
