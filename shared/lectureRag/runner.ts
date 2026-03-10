import type { Timestamp } from "firebase-admin/firestore";
import {
  LECTURE_RAG_SOURCES_COLLECTION,
} from "./schema.js";
import { buildLectureKey, buildLectureRagChunks } from "./chunker.js";
import { upsertLectureRagForReference } from "./persistence.js";
import {
  VIDEO_TRANSCRIPTS_COLLECTION,
  type TranscriptImportResult,
  type TranscriptImportTarget,
  type VideoTranscriptDocShape,
} from "../videoTranscripts/index.js";

type LectureRagReference = TranscriptImportTarget["references"][number];
type TranscriptStorageBucket = LectureRagRunnerDeps["bucket"];

export interface LectureRagRunnerDeps {
  bucket: {
    file: (path: string) => {
      download: () => Promise<[Uint8Array]>;
    };
  } | null;
  db: FirebaseFirestore.Firestore;
  getEmbeddingsBatch: (
    texts: string[],
    onProgress?: (done: number, total: number) => void
  ) => Promise<number[][]>;
}

export interface LectureRagRunnerOptions {
  force: boolean;
  now: Timestamp;
  onProgress?: (done: number, total: number) => void;
}

export interface LectureRagRunnerResult {
  chunkCount: number;
  lectureKeys: string[];
  processedReferences: number;
  skippedReferences: number;
  status: "missing_transcript" | "processed" | "skipped";
  youtubeVideoId: string;
}

function parseTranscriptPayload(raw: Uint8Array) {
  const text = new TextDecoder().decode(raw);
  return JSON.parse(text) as TranscriptImportResult;
}

export async function loadLectureTranscript(
  db: FirebaseFirestore.Firestore,
  bucket: TranscriptStorageBucket,
  youtubeVideoId: string
) {
  const snapshot = await db
    .collection(VIDEO_TRANSCRIPTS_COLLECTION)
    .doc(youtubeVideoId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const metadata = snapshot.data() as VideoTranscriptDocShape<FirebaseFirestore.Timestamp>;
  if (metadata.status !== "available" || !metadata.storagePath || !bucket) {
    return null;
  }

  const [raw] = await bucket.file(metadata.storagePath).download();
  return parseTranscriptPayload(raw);
}

export async function getLectureRagProcessableReferences(
  db: FirebaseFirestore.Firestore,
  target: TranscriptImportTarget,
  force: boolean
) {
  const checks = await Promise.all(
    target.references.map(async (reference) => {
      if (force) {
        return reference;
      }

      const lectureKey = buildLectureKey(reference, target.youtubeVideoId);
      const sourceDoc = await db
        .collection(LECTURE_RAG_SOURCES_COLLECTION)
        .doc(lectureKey)
        .get();

      return sourceDoc.exists ? null : reference;
    })
  );

  return checks.filter((reference): reference is LectureRagReference => Boolean(reference));
}

export async function ingestLectureRagTarget(
  deps: LectureRagRunnerDeps,
  target: TranscriptImportTarget,
  options: LectureRagRunnerOptions
): Promise<LectureRagRunnerResult> {
  const processableReferences = await getLectureRagProcessableReferences(
    deps.db,
    target,
    options.force
  );

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

  const transcript = await loadLectureTranscript(
    deps.db,
    deps.bucket,
    target.youtubeVideoId
  );

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

  const embeddings = await deps.getEmbeddingsBatch(
    chunks.map((chunk) => chunk.text),
    options.onProgress
  );

  const lectureKeys: string[] = [];

  for (const reference of processableReferences) {
    const result = await upsertLectureRagForReference(
      deps.db,
      reference,
      target.youtubeVideoId,
      transcript,
      embeddings,
      options.now
    );
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
