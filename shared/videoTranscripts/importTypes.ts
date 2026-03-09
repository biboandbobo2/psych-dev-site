import type { VideoTranscriptSegment } from "./schema.js";

export type ImportStatus = "available" | "unavailable" | "failed";

export interface ImportOptions {
  dryRun: boolean;
  force: boolean;
  langs: string[];
  limit: number | null;
  video: string | null;
}

export interface VideoReference {
  courseId: string;
  lessonId: string;
  sourcePath: string;
  title: string;
  url: string;
}

export interface TranscriptImportTarget {
  youtubeVideoId: string;
  references: VideoReference[];
}

export interface TranscriptImportResult {
  availableLanguages: string[];
  language: string | null;
  segments: VideoTranscriptSegment[];
}

export interface TranscriptUpsertOptions {
  dryRun: boolean;
  force: boolean;
  langs: string[];
}

export interface TranscriptUpsertResult {
  youtubeVideoId: string;
  status: "available" | "skipped" | "unavailable" | "failed";
  language?: string | null;
  segmentCount?: number;
  errorCode?: string;
  errorMessage?: string;
}
