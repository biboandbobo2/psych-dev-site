import type { TranscriptImportResult, VideoReference } from "../videoTranscripts/importTypes.js";
import { FieldValue } from "firebase-admin/firestore";
import {
  LECTURE_RAG_CHUNKS_COLLECTION,
  LECTURE_RAG_SOURCES_COLLECTION,
} from "./schema.js";
import {
  buildLectureKey,
  buildLectureRagChunkDocs,
  buildLectureRagChunks,
  buildLectureRagSourceDoc,
} from "./chunker.js";
import { commitBatchedWriteOperations } from "../firestore/writeBatches.js";

const LECTURE_RAG_BATCH_SIZE = 400;

type SetOperation = {
  type: "set";
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
};

type DeleteOperation = {
  type: "delete";
  ref: FirebaseFirestore.DocumentReference;
};

type LectureRagWriteOperation = SetOperation | DeleteOperation;

async function commitLectureRagOperations(
  db: FirebaseFirestore.Firestore,
  operations: LectureRagWriteOperation[]
) {
  await commitBatchedWriteOperations(
    db,
    operations,
    LECTURE_RAG_BATCH_SIZE,
    (batch, operation) => {
      if (operation.type === "delete") {
        batch.delete(operation.ref);
        return;
      }

      batch.set(operation.ref, operation.data, { merge: true });
    }
  );
}

async function listLectureChunkRefs(
  db: FirebaseFirestore.Firestore,
  lectureKey: string
) {
  const snapshot = await db
    .collection(LECTURE_RAG_CHUNKS_COLLECTION)
    .where("lectureKey", "==", lectureKey)
    .get();

  return snapshot.docs.map((docSnap) => docSnap.ref);
}

export async function upsertLectureRagForReference(
  db: FirebaseFirestore.Firestore,
  reference: VideoReference,
  youtubeVideoId: string,
  transcript: TranscriptImportResult,
  embeddings: number[][],
  now: FirebaseFirestore.Timestamp
) {
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

  const sourceDoc = buildLectureRagSourceDoc(
    reference,
    youtubeVideoId,
    transcript,
    chunks.length,
    now
  );
  const chunkDocs = buildLectureRagChunkDocs(
    reference,
    youtubeVideoId,
    chunks,
    embeddings,
    now
  );
  const existingChunkRefs = await listLectureChunkRefs(db, lectureKey);

  const operations: LectureRagWriteOperation[] = [
    {
      type: "set",
      ref: db.collection(LECTURE_RAG_SOURCES_COLLECTION).doc(lectureKey),
      data: sourceDoc,
    },
    ...existingChunkRefs.map((ref) => ({
      type: "delete" as const,
      ref,
    })),
    ...chunkDocs.map((chunkDoc) => ({
      type: "set" as const,
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

export async function deleteLectureRagForReference(
  db: FirebaseFirestore.Firestore,
  lectureKey: string
) {
  const sourceRef = db.collection(LECTURE_RAG_SOURCES_COLLECTION).doc(lectureKey);
  const chunkRefs = await listLectureChunkRefs(db, lectureKey);
  const operations: LectureRagWriteOperation[] = [
    ...chunkRefs.map((ref) => ({
      type: "delete" as const,
      ref,
    })),
    {
      type: "delete" as const,
      ref: sourceRef,
    },
  ];

  await commitLectureRagOperations(db, operations);
}
