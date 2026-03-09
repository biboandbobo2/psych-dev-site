import * as YoutubeTranscriptPlus from "youtube-transcript-plus";
function normalizeSegments(transcript) {
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
function getTranscriptErrorName(error) {
    return typeof error === "object" && error !== null
        ? error.name ?? null
        : null;
}
export function mapTranscriptErrorCode(error) {
    const errorName = getTranscriptErrorName(error);
    if (errorName === "YoutubeTranscriptDisabledError")
        return "TRANSCRIPT_DISABLED";
    if (errorName === "YoutubeTranscriptNotAvailableError")
        return "TRANSCRIPT_NOT_AVAILABLE";
    if (errorName === "YoutubeTranscriptNotAvailableLanguageError") {
        return "TRANSCRIPT_LANGUAGE_NOT_AVAILABLE";
    }
    if (errorName === "YoutubeTranscriptVideoUnavailableError")
        return "VIDEO_UNAVAILABLE";
    if (errorName === "YoutubeTranscriptTooManyRequestError")
        return "YOUTUBE_RATE_LIMITED";
    if (errorName === "YoutubeTranscriptInvalidVideoIdError")
        return "INVALID_VIDEO_ID";
    return "UNKNOWN";
}
export function getTranscriptErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function resolveTranscriptFailureStatus(error) {
    const errorName = getTranscriptErrorName(error);
    if (errorName === "YoutubeTranscriptDisabledError" ||
        errorName === "YoutubeTranscriptNotAvailableError" ||
        errorName === "YoutubeTranscriptNotAvailableLanguageError" ||
        errorName === "YoutubeTranscriptVideoUnavailableError" ||
        errorName === "YoutubeTranscriptInvalidVideoIdError") {
        return "unavailable";
    }
    return "failed";
}
export function getAvailableLanguagesFromError(error) {
    if (getTranscriptErrorName(error) === "YoutubeTranscriptNotAvailableLanguageError" &&
        typeof error === "object" &&
        error !== null &&
        Array.isArray(error.availableLangs)) {
        return error.availableLangs ?? [];
    }
    return [];
}
export async function fetchTranscriptWithFallbacks(youtubeVideoId, langs) {
    const availableLanguages = new Set();
    for (const lang of langs) {
        try {
            const transcript = await YoutubeTranscriptPlus.fetchTranscript(youtubeVideoId, { lang });
            return {
                availableLanguages: [...availableLanguages, lang],
                language: transcript[0]?.lang ?? lang,
                segments: normalizeSegments(transcript),
            };
        }
        catch (error) {
            if (getTranscriptErrorName(error) === "YoutubeTranscriptNotAvailableLanguageError" &&
                typeof error === "object" &&
                error !== null &&
                Array.isArray(error.availableLangs)) {
                error.availableLangs?.forEach((availableLang) => availableLanguages.add(availableLang));
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
