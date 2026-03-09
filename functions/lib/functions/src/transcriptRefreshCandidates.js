import { Timestamp } from "firebase-admin/firestore";
import { collectTranscriptTargets, } from "../../shared/videoTranscripts/index.js";
import { VIDEO_TRANSCRIPTS_COLLECTION, } from "../../shared/videoTranscripts/schema.js";
const TRANSCRIPT_DOC_BATCH_SIZE = 400;
function getTimestampMillis(value) {
    return value instanceof Timestamp ? value.toMillis() : null;
}
export function getTranscriptRefreshReason(doc, now) {
    if (!doc) {
        return "missing";
    }
    if (doc.status !== "unavailable" && doc.status !== "failed") {
        return null;
    }
    const nextRetryAtMs = getTimestampMillis(doc.nextRetryAt);
    if (nextRetryAtMs !== null && nextRetryAtMs > now.toMillis()) {
        return null;
    }
    return doc.status;
}
async function getTranscriptDocSnapshots(db, docRefs) {
    if (!docRefs.length) {
        return [];
    }
    const chunkPromises = [];
    for (let index = 0; index < docRefs.length; index += TRANSCRIPT_DOC_BATCH_SIZE) {
        const chunk = docRefs.slice(index, index + TRANSCRIPT_DOC_BATCH_SIZE);
        chunkPromises.push(db.getAll(...chunk));
    }
    const chunkSnapshots = await Promise.all(chunkPromises);
    return chunkSnapshots.flat();
}
export async function collectTranscriptRefreshCandidates(db, now, limit) {
    const targets = await collectTranscriptTargets(db);
    const docRefs = targets.map((target) => db.collection(VIDEO_TRANSCRIPTS_COLLECTION).doc(target.youtubeVideoId));
    const docSnapshots = await getTranscriptDocSnapshots(db, docRefs);
    const docsById = new Map();
    docSnapshots.forEach((snapshot) => {
        docsById.set(snapshot.id, snapshot.data());
    });
    const candidates = [];
    targets.forEach((target) => {
        const existingDoc = docsById.get(target.youtubeVideoId);
        const reason = getTranscriptRefreshReason(existingDoc, now);
        if (!reason || candidates.length >= limit) {
            return;
        }
        candidates.push({
            target,
            reason,
            existingStatus: existingDoc?.status ?? null,
        });
    });
    return {
        candidateCount: candidates.length,
        candidates,
        scannedVideoCount: targets.length,
    };
}
