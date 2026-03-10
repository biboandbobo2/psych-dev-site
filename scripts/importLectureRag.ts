import { Timestamp } from "firebase-admin/firestore";
import { initAdmin } from "./_adminInit";
import { getEmbeddingsBatch } from "../functions/src/lib/embeddings.js";
import {
  buildLectureKey,
  buildLectureRagChunks,
  LECTURE_RAG_SOURCES_COLLECTION,
  upsertLectureRagForReference,
} from "../shared/lectureRag/index.js";
import {
  VIDEO_TRANSCRIPTS_COLLECTION,
  type TranscriptImportResult,
  type TranscriptImportTarget,
  type VideoTranscriptDocShape,
  collectTranscriptTargets,
} from "../shared/videoTranscripts/index.js";

interface LectureRagImportOptions {
  dryRun: boolean;
  force: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): LectureRagImportOptions {
  let dryRun = false;
  let force = false;
  let limit: number | null = null;

  argv.forEach((arg) => {
    if (arg === "--dry-run") {
      dryRun = true;
      return;
    }

    if (arg === "--force") {
      force = true;
      return;
    }

    if (arg.startsWith("--limit=")) {
      const rawLimit = Number(arg.slice("--limit=".length));
      if (Number.isFinite(rawLimit) && rawLimit > 0) {
        limit = Math.floor(rawLimit);
      }
    }
  });

  return {
    dryRun,
    force,
    limit,
  };
}

function parseTranscriptPayload(raw: Uint8Array) {
  const text = new TextDecoder().decode(raw);
  return JSON.parse(text) as TranscriptImportResult;
}

async function loadTranscript(
  admin: ReturnType<typeof initAdmin>,
  target: TranscriptImportTarget
) {
  const snapshot = await admin.db
    .collection(VIDEO_TRANSCRIPTS_COLLECTION)
    .doc(target.youtubeVideoId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const metadata = snapshot.data() as VideoTranscriptDocShape<FirebaseFirestore.Timestamp>;
  if (metadata.status !== "available" || !metadata.storagePath || !admin.bucket) {
    return null;
  }

  const [raw] = await admin.bucket.file(metadata.storagePath).download();
  return parseTranscriptPayload(raw);
}

async function getProcessableReferences(
  admin: ReturnType<typeof initAdmin>,
  target: TranscriptImportTarget,
  force: boolean
) {
  const checks = await Promise.all(
    target.references.map(async (reference) => {
      const lectureKey = buildLectureKey(reference, target.youtubeVideoId);
      if (force) {
        return reference;
      }

      const sourceDoc = await admin.db
        .collection(LECTURE_RAG_SOURCES_COLLECTION)
        .doc(lectureKey)
        .get();

      return sourceDoc.exists ? null : reference;
    })
  );

  return checks.filter((reference): reference is TranscriptImportTarget["references"][number] => Boolean(reference));
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const admin = initAdmin();

  console.log("🎓 Ingest lecture RAG from saved transcripts");
  console.log(
    `Mode: ${options.dryRun ? "dry-run" : "write"}${options.force ? ", force" : ""}`
  );

  const transcriptTargets = await collectTranscriptTargets(admin.db);
  const limitedTargets = options.limit
    ? transcriptTargets.slice(0, options.limit)
    : transcriptTargets;

  const summary = {
    processedLectures: 0,
    skippedLectures: 0,
    missingTranscripts: 0,
  };

  for (const [index, target] of limitedTargets.entries()) {
    const processableReferences = await getProcessableReferences(admin, target, options.force);
    if (!processableReferences.length) {
      summary.skippedLectures += target.references.length;
      continue;
    }

    const transcript = await loadTranscript(admin, target);
    if (!transcript) {
      summary.missingTranscripts += processableReferences.length;
      console.log(
        `[${index + 1}/${limitedTargets.length}] ${target.youtubeVideoId} ∅ transcript unavailable`
      );
      continue;
    }

    const chunks = buildLectureRagChunks(transcript);
    if (!chunks.length) {
      summary.missingTranscripts += processableReferences.length;
      console.log(
        `[${index + 1}/${limitedTargets.length}] ${target.youtubeVideoId} ∅ no lecture chunks`
      );
      continue;
    }

    console.log(
      `[${index + 1}/${limitedTargets.length}] ${target.youtubeVideoId} → ${processableReferences.length} lecture(s), ${chunks.length} chunk(s)`
    );

    if (options.dryRun) {
      processableReferences.forEach((reference) => {
        console.log(`  - ${reference.courseId}/${reference.lessonId}: ${reference.title}`);
      });
      summary.processedLectures += processableReferences.length;
      continue;
    }

    const embeddings = await getEmbeddingsBatch(chunks.map((chunk) => chunk.text));
    const now = Timestamp.now();

    for (const reference of processableReferences) {
      await upsertLectureRagForReference(
        admin.db,
        reference,
        target.youtubeVideoId,
        transcript,
        embeddings,
        now
      );
      summary.processedLectures += 1;
    }
  }

  console.log("---");
  console.log(`processed lectures: ${summary.processedLectures}`);
  console.log(`skipped lectures: ${summary.skippedLectures}`);
  console.log(`missing transcripts: ${summary.missingTranscripts}`);
}

run().catch((error) => {
  console.error("❌ Lecture RAG import failed");
  console.error(error);
  process.exit(1);
});
