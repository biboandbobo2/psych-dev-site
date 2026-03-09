import * as YoutubeTranscriptPlus from "youtube-transcript-plus";
import type {
  ImportStatus,
  TranscriptImportResult,
} from "./importTypes.js";
import type { VideoTranscriptSegment } from "./schema.js";

function normalizeSegments(
  transcript: YoutubeTranscriptPlus.TranscriptResponse[]
): VideoTranscriptSegment[] {
  return transcript.map((segment, index) => {
    const startMs = Math.round(segment.offset * 1000);
    const durationMs = Math.max(0, Math.round(segment.duration * 1000));

    return {
      index,
      startMs,
      endMs: startMs + durationMs,
      durationMs,
      text: segment.text.trim(),
    };
  });
}

type TranscriptErrorLike = {
  availableLangs?: string[];
  message?: string;
  name?: string;
};

function getTranscriptErrorName(error: unknown) {
  return typeof error === "object" && error !== null
    ? (error as TranscriptErrorLike).name ?? null
    : null;
}

export function mapTranscriptErrorCode(error: unknown) {
  const errorName = getTranscriptErrorName(error);
  if (errorName === "YoutubeTranscriptDisabledError") return "TRANSCRIPT_DISABLED";
  if (errorName === "YoutubeTranscriptNotAvailableError") return "TRANSCRIPT_NOT_AVAILABLE";
  if (errorName === "YoutubeTranscriptNotAvailableLanguageError") {
    return "TRANSCRIPT_LANGUAGE_NOT_AVAILABLE";
  }
  if (errorName === "YoutubeTranscriptVideoUnavailableError") return "VIDEO_UNAVAILABLE";
  if (errorName === "YoutubeTranscriptTooManyRequestError") return "YOUTUBE_RATE_LIMITED";
  if (errorName === "YoutubeTranscriptInvalidVideoIdError") return "INVALID_VIDEO_ID";
  return "UNKNOWN";
}

export function getTranscriptErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function resolveTranscriptFailureStatus(error: unknown): ImportStatus {
  const errorName = getTranscriptErrorName(error);
  if (
    errorName === "YoutubeTranscriptDisabledError" ||
    errorName === "YoutubeTranscriptNotAvailableError" ||
    errorName === "YoutubeTranscriptNotAvailableLanguageError" ||
    errorName === "YoutubeTranscriptVideoUnavailableError" ||
    errorName === "YoutubeTranscriptInvalidVideoIdError"
  ) {
    return "unavailable";
  }

  return "failed";
}

export function getAvailableLanguagesFromError(error: unknown) {
  if (
    getTranscriptErrorName(error) === "YoutubeTranscriptNotAvailableLanguageError" &&
    typeof error === "object" &&
    error !== null &&
    Array.isArray((error as TranscriptErrorLike).availableLangs)
  ) {
    return (error as TranscriptErrorLike).availableLangs ?? [];
  }

  return [];
}

export async function fetchTranscriptWithFallbacks(
  youtubeVideoId: string,
  langs: string[]
): Promise<TranscriptImportResult> {
  const availableLanguages = new Set<string>();

  for (const lang of langs) {
    try {
      const transcript = await YoutubeTranscriptPlus.fetchTranscript(youtubeVideoId, { lang });
      return {
        availableLanguages: [...availableLanguages, lang],
        language: transcript[0]?.lang ?? lang,
        segments: normalizeSegments(transcript),
      };
    } catch (error: unknown) {
      if (
        getTranscriptErrorName(error) === "YoutubeTranscriptNotAvailableLanguageError" &&
        typeof error === "object" &&
        error !== null &&
        Array.isArray((error as TranscriptErrorLike).availableLangs)
      ) {
        (error as TranscriptErrorLike).availableLangs?.forEach((availableLang: string) =>
          availableLanguages.add(availableLang)
        );
        continue;
      }

      throw error;
    }
  }

  const transcript = await YoutubeTranscriptPlus.fetchTranscript(youtubeVideoId);
  const detectedLanguage = transcript[0]?.lang ?? null;
  if (detectedLanguage) {
    availableLanguages.add(detectedLanguage);
  }

  return {
    availableLanguages: [...availableLanguages],
    language: detectedLanguage,
    segments: normalizeSegments(transcript),
  };
}
