import { LECTURE_RAG_SOURCES_COLLECTION, } from "./schema.js";
import { buildLectureKey, buildLectureRagChunks } from "./chunker.js";
import { upsertLectureRagForReference } from "./persistence.js";
import { VIDEO_TRANSCRIPTS_COLLECTION, } from "../videoTranscripts/index.js";
function parseTranscriptPayload(raw) {
    const text = new TextDecoder().decode(raw);
    return JSON.parse(text);
}
export async function loadLectureTranscript(db, bucket, youtubeVideoId) {
    const snapshot = await db
        .collection(VIDEO_TRANSCRIPTS_COLLECTION)
        .doc(youtubeVideoId)
        .get();
    if (!snapshot.exists) {
        return null;
    }
    const metadata = snapshot.data();
    if (metadata.status !== "available" || !metadata.storagePath || !bucket) {
        return null;
    }
    const [raw] = await bucket.file(metadata.storagePath).download();
    return parseTranscriptPayload(raw);
}
export async function getLectureRagProcessableReferences(db, target, force) {
    const checks = await Promise.all(target.references.map(async (reference) => {
        if (force) {
            return reference;
        }
        const lectureKey = buildLectureKey(reference, target.youtubeVideoId);
        const sourceDoc = await db
            .collection(LECTURE_RAG_SOURCES_COLLECTION)
            .doc(lectureKey)
            .get();
        return sourceDoc.exists ? null : reference;
    }));
    return checks.filter((reference) => Boolean(reference));
}
export async function ingestLectureRagTarget(deps, target, options) {
    const processableReferences = await getLectureRagProcessableReferences(deps.db, target, options.force);
    if (!processableReferences.length) {
        return {
            chunkCount: 0,
            lectureKeys: [],
            processedReferences: 0,
            skippedReferences: target.references.length,
            status: "skipped",
            youtubeVideoId: target.youtubeVideoId,
        };
    }
    const transcript = await loadLectureTranscript(deps.db, deps.bucket, target.youtubeVideoId);
    if (!transcript) {
        return {
            chunkCount: 0,
            lectureKeys: [],
            processedReferences: 0,
            skippedReferences: target.references.length - processableReferences.length,
            status: "missing_transcript",
            youtubeVideoId: target.youtubeVideoId,
        };
    }
    const chunks = buildLectureRagChunks(transcript);
    if (!chunks.length) {
        return {
            chunkCount: 0,
            lectureKeys: [],
            processedReferences: 0,
            skippedReferences: target.references.length - processableReferences.length,
            status: "missing_transcript",
            youtubeVideoId: target.youtubeVideoId,
        };
    }
    const embeddings = await deps.getEmbeddingsBatch(chunks.map((chunk) => chunk.text), options.onProgress);
    const lectureKeys = [];
    for (const reference of processableReferences) {
        const result = await upsertLectureRagForReference(deps.db, reference, target.youtubeVideoId, transcript, embeddings, options.now);
        lectureKeys.push(result.lectureKey);
    }
    return {
        chunkCount: chunks.length,
        lectureKeys,
        processedReferences: processableReferences.length,
        skippedReferences: target.references.length - processableReferences.length,
        status: "processed",
        youtubeVideoId: target.youtubeVideoId,
    };
}
