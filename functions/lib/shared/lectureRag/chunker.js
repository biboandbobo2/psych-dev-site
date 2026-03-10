import { formatTranscriptTimestamp } from "../videoTranscripts/searchIndex.js";
import { LECTURE_RAG_VERSION, } from "./schema.js";
const LECTURE_RAG_CHUNK_MAX_SEGMENTS = 6;
const LECTURE_RAG_CHUNK_MAX_CHARS = 1200;
function normalizeLectureRagText(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function buildChunkText(parts) {
    return parts
        .map((part) => part.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}
function getTranscriptDurationMs(transcript) {
    const lastSegment = transcript.segments[transcript.segments.length - 1];
    return lastSegment?.endMs ?? null;
}
function finalizeLectureChunk(entries, chunkIndex) {
    if (!entries.length) {
        return null;
    }
    const text = buildChunkText(entries.map((entry) => entry.text));
    if (!text) {
        return null;
    }
    return {
        chunkIndex,
        endMs: entries[entries.length - 1].endMs,
        normalizedText: normalizeLectureRagText(text),
        segmentCount: entries.length,
        startMs: entries[0].startMs,
        text,
        timestampLabel: formatTranscriptTimestamp(entries[0].startMs),
    };
}
export function buildLectureRagChunks(transcript) {
    const chunks = [];
    let currentSegments = [];
    let currentTextLength = 0;
    transcript.segments.forEach((segment) => {
        const normalizedText = segment.text.replace(/\s+/g, " ").trim();
        if (!normalizedText) {
            return;
        }
        const shouldFlush = currentSegments.length >= LECTURE_RAG_CHUNK_MAX_SEGMENTS ||
            currentTextLength + normalizedText.length + 1 > LECTURE_RAG_CHUNK_MAX_CHARS;
        if (currentSegments.length > 0 && shouldFlush) {
            const readyChunk = finalizeLectureChunk(currentSegments, chunks.length);
            if (readyChunk) {
                chunks.push(readyChunk);
            }
            currentSegments = [];
            currentTextLength = 0;
        }
        currentSegments.push(segment);
        currentTextLength += normalizedText.length + 1;
    });
    const finalChunk = finalizeLectureChunk(currentSegments, chunks.length);
    if (finalChunk) {
        chunks.push(finalChunk);
    }
    return chunks;
}
export function buildLectureKey(reference, youtubeVideoId) {
    return `${reference.courseId}::${reference.lessonId}::${youtubeVideoId}`;
}
export function buildLectureRagSourceDoc(reference, youtubeVideoId, transcript, chunkCount, now) {
    return {
        lectureKey: buildLectureKey(reference, youtubeVideoId),
        youtubeVideoId,
        courseId: reference.courseId,
        periodId: reference.lessonId,
        periodTitle: reference.lessonTitle,
        lectureTitle: reference.title,
        sourcePath: reference.sourcePath,
        sourceUrl: reference.url,
        active: true,
        chunkCount,
        transcriptSegmentCount: transcript.segments.length,
        durationMs: getTranscriptDurationMs(transcript),
        updatedAt: now,
        version: LECTURE_RAG_VERSION,
    };
}
export function buildLectureRagChunkDocs(reference, youtubeVideoId, chunks, embeddings, now) {
    if (chunks.length !== embeddings.length) {
        throw new Error(`Chunks/embeddings mismatch for ${reference.title}: ${chunks.length} chunks vs ${embeddings.length} embeddings`);
    }
    const lectureKey = buildLectureKey(reference, youtubeVideoId);
    return chunks.map((chunk, index) => ({
        id: `${lectureKey}::${chunk.chunkIndex}`,
        data: {
            lectureKey,
            youtubeVideoId,
            courseId: reference.courseId,
            periodId: reference.lessonId,
            periodTitle: reference.lessonTitle,
            lectureTitle: reference.title,
            sourcePath: reference.sourcePath,
            sourceUrl: reference.url,
            chunkIndex: chunk.chunkIndex,
            startMs: chunk.startMs,
            endMs: chunk.endMs,
            timestampLabel: chunk.timestampLabel,
            segmentCount: chunk.segmentCount,
            text: chunk.text,
            normalizedText: chunk.normalizedText,
            embedding: embeddings[index],
            updatedAt: now,
            version: LECTURE_RAG_VERSION,
        },
    }));
}
