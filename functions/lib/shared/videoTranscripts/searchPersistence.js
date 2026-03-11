import { buildTranscriptSearchChunkDocs } from "./searchIndex.js";
import { VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION, VIDEO_TRANSCRIPT_SEARCH_COLLECTION, } from "./schema.js";
import { commitBatchedWriteOperations } from "../firestore/writeBatches.js";
const TRANSCRIPT_SEARCH_BATCH_SIZE = 400;
function getTranscriptSearchDocRef(db, youtubeVideoId) {
    return db.collection(VIDEO_TRANSCRIPT_SEARCH_COLLECTION).doc(youtubeVideoId);
}
async function listTranscriptSearchChunkRefs(docRef) {
    return docRef.collection(VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION).listDocuments();
}
async function commitSearchOperations(db, operations) {
    await commitBatchedWriteOperations(db, operations, TRANSCRIPT_SEARCH_BATCH_SIZE, (batch, operation) => {
        if (operation.type === "delete") {
            batch.delete(operation.ref);
            return;
        }
        batch.set(operation.ref, operation.data, { merge: true });
    });
}
export async function upsertTranscriptSearchIndex(db, target, transcript, now) {
    const docRef = getTranscriptSearchDocRef(db, target.youtubeVideoId);
    const existingChunkRefs = await listTranscriptSearchChunkRefs(docRef);
    const payload = buildTranscriptSearchChunkDocs(target, transcript, now);
    if (!payload.docs.length) {
        await deleteTranscriptSearchIndex(db, target.youtubeVideoId);
        return payload;
    }
    const operations = [
        {
            type: "set",
            ref: docRef,
            data: payload.parentDoc,
        },
        ...existingChunkRefs.map((ref) => ({
            type: "delete",
            ref,
        })),
        ...payload.docs.map((chunkDoc) => ({
            type: "set",
            ref: docRef.collection(VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION).doc(chunkDoc.id),
            data: chunkDoc.data,
        })),
    ];
    await commitSearchOperations(db, operations);
    return payload;
}
export async function deleteTranscriptSearchIndex(db, youtubeVideoId) {
    const docRef = getTranscriptSearchDocRef(db, youtubeVideoId);
    const existingChunkRefs = await listTranscriptSearchChunkRefs(docRef);
    const operations = [
        ...existingChunkRefs.map((ref) => ({
            type: "delete",
            ref,
        })),
        {
            type: "delete",
            ref: docRef,
        },
    ];
    if (!operations.length) {
        return;
    }
    await commitSearchOperations(db, operations);
}
