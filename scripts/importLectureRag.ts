import { Timestamp } from "firebase-admin/firestore";

import { initAdmin } from "./_adminInit";
import {
  getLectureRagProcessableReferences,
  LECTURE_RAG_JOBS_COLLECTION,
} from "../shared/lectureRag/index.js";
import {
  type TranscriptImportTarget,
  collectTranscriptTargets,
} from "../shared/videoTranscripts/index.js";

const LECTURE_RAG_REGION = "europe-west1";

interface LectureRagImportOptions {
  dryRun: boolean;
  force: boolean;
  functionUrl: string | null;
  functionSecret: string | null;
  limit: number | null;
}

interface LectureRagCloudResponse {
  chunkCount: number;
  error?: string;
  jobId: string;
  lectureKeys: string[];
  ok: boolean;
  processedReferences: number;
  skippedReferences: number;
  status: "missing_transcript" | "processed" | "skipped";
  youtubeVideoId: string;
}

function parseArgs(argv: string[]): LectureRagImportOptions {
  let dryRun = false;
  let force = false;
  let functionUrl: string | null = null;
  let functionSecret = process.env.LECTURE_INGEST_SECRET?.trim() || null;
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
      return;
    }

    if (arg.startsWith("--function-url=")) {
      functionUrl = arg.slice("--function-url=".length).trim() || null;
      return;
    }

    if (arg.startsWith("--function-secret=")) {
      functionSecret = arg.slice("--function-secret=".length).trim() || null;
    }
  });

  return {
    dryRun,
    force,
    functionUrl,
    functionSecret,
    limit,
  };
}

function resolveLectureRagFunctionUrl(
  projectId: string | null | undefined,
  explicitUrl: string | null
) {
  if (explicitUrl) {
    return explicitUrl;
  }

  if (!projectId) {
    return null;
  }

  return `https://${LECTURE_RAG_REGION}-${projectId}.cloudfunctions.net/ingestLectureRag`;
}

async function ensureLectureJob(
  db: FirebaseFirestore.Firestore,
  youtubeVideoId: string
) {
  const jobRef = db.collection(LECTURE_RAG_JOBS_COLLECTION).doc();
  const now = Timestamp.now();

  await jobRef.set({
    id: jobRef.id,
    youtubeVideoId,
    status: "queued",
    step: "resolve",
    progress: { done: 0, total: 0 },
    lectureKeys: [],
    logs: ["Job created from CLI trigger"],
    error: null,
    chunkCount: 0,
    referenceCount: 0,
    startedAt: now,
    finishedAt: null,
  });

  return jobRef.id;
}

async function triggerLectureRagIngestion(
  functionUrl: string,
  functionSecret: string,
  target: TranscriptImportTarget,
  force: boolean,
  jobId: string
) {
  const response = await fetch(functionUrl, {
    body: JSON.stringify({
      force,
      jobId,
      youtubeVideoId: target.youtubeVideoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Ingest-Secret": functionSecret,
    },
    method: "POST",
  });

  const payload = (await response.json()) as LectureRagCloudResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Lecture ingest failed with ${response.status}`);
  }

  return payload;
}

function printDryRunTarget(
  index: number,
  total: number,
  target: TranscriptImportTarget,
  referenceCount: number
) {
  console.log(
    `[${index + 1}/${total}] ${target.youtubeVideoId} → ${referenceCount} lecture(s)`
  );

  target.references.forEach((reference) => {
    console.log(`  - ${reference.courseId}/${reference.lessonId}: ${reference.title}`);
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const admin = initAdmin();
  const functionUrl = resolveLectureRagFunctionUrl(admin.projectId, options.functionUrl);

  console.log("🎓 Ingest lecture RAG from saved transcripts");
  console.log(
    `Mode: ${options.dryRun ? "dry-run" : "cloud"}${options.force ? ", force" : ""}`
  );
  if (!options.dryRun) {
    if (!functionUrl) {
      throw new Error(
        "Lecture Cloud Function URL is unavailable. Pass --function-url or configure project ID."
      );
    }
    if (!options.functionSecret) {
      throw new Error(
        "Lecture ingest secret is unavailable. Pass --function-secret or set LECTURE_INGEST_SECRET."
      );
    }
    console.log(`Function: ${functionUrl}`);
  }

  const transcriptTargets = await collectTranscriptTargets(admin.db);
  const limitedTargets = options.limit
    ? transcriptTargets.slice(0, options.limit)
    : transcriptTargets;

  const summary = {
    failedTargets: 0,
    processedLectures: 0,
    skippedLectures: 0,
    triggerErrors: 0,
  };

  for (const [index, target] of limitedTargets.entries()) {
    const processableReferences = await getLectureRagProcessableReferences(
      admin.db,
      target,
      options.force
    );

    if (!processableReferences.length) {
      summary.skippedLectures += target.references.length;
      continue;
    }

    if (options.dryRun) {
      printDryRunTarget(index, limitedTargets.length, target, processableReferences.length);
      summary.processedLectures += processableReferences.length;
      continue;
    }

    const jobId = await ensureLectureJob(admin.db, target.youtubeVideoId);

    try {
      const payload = await triggerLectureRagIngestion(
        functionUrl!,
        options.functionSecret!,
        target,
        options.force,
        jobId
      );
      console.log(
        `[${index + 1}/${limitedTargets.length}] ${target.youtubeVideoId} ✓ ${payload.processedReferences} lecture(s), ${payload.chunkCount} chunk(s), job ${payload.jobId}`
      );
      summary.processedLectures += payload.processedReferences;
      summary.skippedLectures += payload.skippedReferences;
    } catch (error) {
      summary.failedTargets += 1;
      summary.triggerErrors += processableReferences.length;
      console.log(
        `[${index + 1}/${limitedTargets.length}] ${target.youtubeVideoId} ✗ ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("---");
  console.log(`processed lectures: ${summary.processedLectures}`);
  console.log(`skipped lectures: ${summary.skippedLectures}`);
  console.log(`failed targets: ${summary.failedTargets}`);
  console.log(`trigger errors: ${summary.triggerErrors}`);
}

run().catch((error) => {
  console.error("❌ Lecture RAG import failed");
  console.error(error);
  process.exit(1);
});
