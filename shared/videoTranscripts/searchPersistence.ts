import type {
  TranscriptImportResult,
  TranscriptImportTarget,
} from "./importTypes.js";
import { buildTranscriptSearchChunkDocs } from "./searchIndex.js";
import {
  VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION,
  VIDEO_TRANSCRIPT_SEARCH_COLLECTION,
} from "./schema.js";
import { commitBatchedWriteOperations } from "../firestore/writeBatches.js";

const TRANSCRIPT_SEARCH_BATCH_SIZE = 400;

type SetOperation = {
  type: "set";
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
};

type DeleteOperation = {
  type: "delete";
  ref: FirebaseFirestore.DocumentReference;
};

type SearchWriteOperation = SetOperation | DeleteOperation;

function getTranscriptSearchDocRef(
  db: FirebaseFirestore.Firestore,
  youtubeVideoId: string
) {
  return db.collection(VIDEO_TRANSCRIPT_SEARCH_COLLECTION).doc(youtubeVideoId);
}

async function listTranscriptSearchChunkRefs(
  docRef: FirebaseFirestore.DocumentReference
) {
  return docRef.collection(VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION).listDocuments();
}

async function commitSearchOperations(
  db: FirebaseFirestore.Firestore,
  operations: SearchWriteOperation[]
) {
  await commitBatchedWriteOperations(
    db,
    operations,
    TRANSCRIPT_SEARCH_BATCH_SIZE,
    (batch, operation) => {
      if (operation.type === "delete") {
        batch.delete(operation.ref);
        return;
      }

      batch.set(operation.ref, operation.data, { merge: true });
    }
  );
}

export async function upsertTranscriptSearchIndex(
  db: FirebaseFirestore.Firestore,
  target: TranscriptImportTarget,
  transcript: TranscriptImportResult,
  now: FirebaseFirestore.Timestamp
) {
  const docRef = getTranscriptSearchDocRef(db, target.youtubeVideoId);
  const existingChunkRefs = await listTranscriptSearchChunkRefs(docRef);
  const payload = buildTranscriptSearchChunkDocs(target, transcript, now);

  if (!payload.docs.length) {
    await deleteTranscriptSearchIndex(db, target.youtubeVideoId);
    return payload;
  }

  const operations: SearchWriteOperation[] = [
    {
      type: "set",
      ref: docRef,
      data: payload.parentDoc,
    },
    ...existingChunkRefs.map((ref) => ({
      type: "delete" as const,
      ref,
    })),
    ...payload.docs.map((chunkDoc) => ({
      type: "set" as const,
      ref: docRef.collection(VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION).doc(chunkDoc.id),
      data: chunkDoc.data,
    })),
  ];

  await commitSearchOperations(db, operations);
  return payload;
}

export async function deleteTranscriptSearchIndex(
  db: FirebaseFirestore.Firestore,
  youtubeVideoId: string
) {
  const docRef = getTranscriptSearchDocRef(db, youtubeVideoId);
  const existingChunkRefs = await listTranscriptSearchChunkRefs(docRef);

  const operations: SearchWriteOperation[] = [
    ...existingChunkRefs.map((ref) => ({
      type: "delete" as const,
      ref,
    })),
    {
      type: "delete" as const,
      ref: docRef,
    },
  ];

  if (!operations.length) {
    return;
  }

  await commitSearchOperations(db, operations);
}
