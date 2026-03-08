import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  fetchTranscript,
  type TranscriptResponse,
} from 'youtube-transcript-plus';
import type { VideoTranscriptSegment } from '../../src/types/videoTranscripts';
import type { ImportStatus, TranscriptImportResult } from './videoTranscriptImportTypes';

function normalizeSegments(transcript: TranscriptResponse[]): VideoTranscriptSegment[] {
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

export function mapTranscriptErrorCode(error: unknown) {
  if (error instanceof YoutubeTranscriptDisabledError) return 'TRANSCRIPT_DISABLED';
  if (error instanceof YoutubeTranscriptNotAvailableError) return 'TRANSCRIPT_NOT_AVAILABLE';
  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) return 'TRANSCRIPT_LANGUAGE_NOT_AVAILABLE';
  if (error instanceof YoutubeTranscriptVideoUnavailableError) return 'VIDEO_UNAVAILABLE';
  if (error instanceof YoutubeTranscriptTooManyRequestError) return 'YOUTUBE_RATE_LIMITED';
  if (error instanceof YoutubeTranscriptInvalidVideoIdError) return 'INVALID_VIDEO_ID';
  return 'UNKNOWN';
}

export function getTranscriptErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function resolveTranscriptFailureStatus(error: unknown): ImportStatus {
  if (
    error instanceof YoutubeTranscriptDisabledError ||
    error instanceof YoutubeTranscriptNotAvailableError ||
    error instanceof YoutubeTranscriptNotAvailableLanguageError ||
    error instanceof YoutubeTranscriptVideoUnavailableError ||
    error instanceof YoutubeTranscriptInvalidVideoIdError
  ) {
    return 'unavailable';
  }

  return 'failed';
}

export function getAvailableLanguagesFromError(error: unknown) {
  return error instanceof YoutubeTranscriptNotAvailableLanguageError ? error.availableLangs : [];
}

export async function fetchTranscriptWithFallbacks(
  youtubeVideoId: string,
  langs: string[]
): Promise<TranscriptImportResult> {
  const availableLanguages = new Set<string>();

  for (const lang of langs) {
    try {
      const transcript = await fetchTranscript(youtubeVideoId, { lang });
      return {
        availableLanguages: [...availableLanguages, lang],
        language: transcript[0]?.lang ?? lang,
        segments: normalizeSegments(transcript),
      };
    } catch (error) {
      if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
        error.availableLangs.forEach((availableLang) => availableLanguages.add(availableLang));
        continue;
      }

      throw error;
    }
  }

  const transcript = await fetchTranscript(youtubeVideoId);
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
