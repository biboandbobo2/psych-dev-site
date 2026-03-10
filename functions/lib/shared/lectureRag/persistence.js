import { FieldValue } from "firebase-admin/firestore";
import { LECTURE_RAG_CHUNKS_COLLECTION, LECTURE_RAG_SOURCES_COLLECTION, } from "./schema.js";
import { buildLectureKey, buildLectureRagChunkDocs, buildLectureRagChunks, buildLectureRagSourceDoc, } from "./chunker.js";
const LECTURE_RAG_BATCH_SIZE = 400;
function chunkOperations(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}
async function commitLectureRagOperations(db, operations) {
    const operationChunks = chunkOperations(operations, LECTURE_RAG_BATCH_SIZE);
    for (const operationChunk of operationChunks) {
        const batch = db.batch();
        operationChunk.forEach((operation) => {
            if (operation.type === "delete") {
                batch.delete(operation.ref);
                return;
            }
            batch.set(operation.ref, operation.data, { merge: true });
        });
        await batch.commit();
    }
}
async function listLectureChunkRefs(db, lectureKey) {
    const snapshot = await db
        .collection(LECTURE_RAG_CHUNKS_COLLECTION)
        .where("lectureKey", "==", lectureKey)
        .get();
    return snapshot.docs.map((docSnap) => docSnap.ref);
}
export async function upsertLectureRagForReference(db, reference, youtubeVideoId, transcript, embeddings, now) {
    const chunks = buildLectureRagChunks(transcript);
    const lectureKey = buildLectureKey(reference, youtubeVideoId);
    if (!chunks.length) {
        await deleteLectureRagForReference(db, lectureKey);
        return {
            chunkCount: 0,
            lectureKey,
            sourceDoc: null,
        };
    }
    const sourceDoc = buildLectureRagSourceDoc(reference, youtubeVideoId, transcript, chunks.length, now);
    const chunkDocs = buildLectureRagChunkDocs(reference, youtubeVideoId, chunks, embeddings, now);
    const existingChunkRefs = await listLectureChunkRefs(db, lectureKey);
    const operations = [
        {
            type: "set",
            ref: db.collection(LECTURE_RAG_SOURCES_COLLECTION).doc(lectureKey),
            data: sourceDoc,
        },
        ...existingChunkRefs.map((ref) => ({
            type: "delete",
            ref,
        })),
        ...chunkDocs.map((chunkDoc) => ({
            type: "set",
            ref: db.collection(LECTURE_RAG_CHUNKS_COLLECTION).doc(chunkDoc.id),
            data: {
                ...chunkDoc.data,
                embedding: FieldValue.vector(chunkDoc.data.embedding),
            },
        })),
    ];
    await commitLectureRagOperations(db, operations);
    return {
        chunkCount: chunkDocs.length,
        chunks,
        lectureKey,
        sourceDoc,
    };
}
export async function deleteLectureRagForReference(db, lectureKey) {
    const sourceRef = db.collection(LECTURE_RAG_SOURCES_COLLECTION).doc(lectureKey);
    const chunkRefs = await listLectureChunkRefs(db, lectureKey);
    const operations = [
        ...chunkRefs.map((ref) => ({
            type: "delete",
            ref,
        })),
        {
            type: "delete",
            ref: sourceRef,
        },
    ];
    await commitLectureRagOperations(db, operations);
}
