import { Timestamp } from "firebase-admin/firestore";
import {
  VIDEO_TRANSCRIPTS_COLLECTION,
  type VideoTranscriptDocShape,
} from "./schema.js";
import type {
  TranscriptImportTarget,
  TranscriptUpsertOptions,
  TranscriptUpsertResult,
} from "./importTypes.js";
import {
  buildTranscriptAvailablePayload,
  buildTranscriptFailedDoc,
  buildTranscriptPendingDoc,
} from "./persistence.js";
import {
  deleteTranscriptSearchIndex,
  upsertTranscriptSearchIndex,
} from "./searchPersistence.js";
import {
  fetchTranscriptWithFallbacks,
  getAvailableLanguagesFromError,
  getTranscriptErrorMessage,
  mapTranscriptErrorCode,
  resolveTranscriptFailureStatus,
} from "./fetcher.js";
import { buildNextRetryDate, getExistingRetryCount } from "./retry.js";

export interface TranscriptAdminContext {
  db: FirebaseFirestore.Firestore;
  bucket: {
    file(path: string): {
      save(
        data: string,
        options: {
          contentType: string;
          resumable: boolean;
        }
      ): Promise<unknown>;
    };
  } | null;
}

export async function upsertTranscript(
  admin: TranscriptAdminContext,
  target: TranscriptImportTarget,
  options: TranscriptUpsertOptions
): Promise<TranscriptUpsertResult> {
  const { bucket, db } = admin;
  let docRef: FirebaseFirestore.DocumentReference | null = null;
  let existingData: Partial<VideoTranscriptDocShape<FirebaseFirestore.Timestamp>> | undefined;

  if (!options.dryRun) {
    if (!bucket) {
      throw new Error(
        "Storage bucket не настроен. Укажите FIREBASE_STORAGE_BUCKET или VITE_FIREBASE_STORAGE_BUCKET."
      );
    }

    docRef = db.collection(VIDEO_TRANSCRIPTS_COLLECTION).doc(target.youtubeVideoId);
    const existingSnapshot = await docRef.get();
    existingData = existingSnapshot.data() as
      | Partial<VideoTranscriptDocShape<FirebaseFirestore.Timestamp>>
      | undefined;

    if (!options.force && existingData?.status === "available") {
      return { status: "skipped", youtubeVideoId: target.youtubeVideoId };
    }
  }

  const now = Timestamp.now();
  const pendingPayload = buildTranscriptPendingDoc(target.youtubeVideoId, now);

  if (!options.dryRun && docRef) {
    await docRef.set(
      {
        ...pendingPayload,
        retryCount: existingData?.retryCount ?? 0,
        lastRetryAt: existingData?.lastRetryAt ?? null,
        nextRetryAt: existingData?.nextRetryAt ?? null,
        lastRetryReason: existingData?.lastRetryReason ?? null,
      },
      { merge: true }
    );
  }

  try {
    const transcript = await fetchTranscriptWithFallbacks(target.youtubeVideoId, options.langs);
    const availablePayload = buildTranscriptAvailablePayload(target, transcript, now);

    if (!options.dryRun && docRef && bucket) {
      await bucket.file(availablePayload.storagePath).save(
        JSON.stringify(availablePayload.storagePayload, null, 2),
        {
          contentType: "application/json; charset=utf-8",
          resumable: false,
        }
      );

      await upsertTranscriptSearchIndex(db, target, transcript, now);
      await docRef.set(availablePayload.docPayload, { merge: true });
    }

    return {
      language: transcript.language,
      segmentCount: transcript.segments.length,
      status: "available",
      youtubeVideoId: target.youtubeVideoId,
    };
  } catch (error) {
    const status = resolveTranscriptFailureStatus(error);
    const errorCode = mapTranscriptErrorCode(error);
    const errorMessage = getTranscriptErrorMessage(error);
    const retryCount = getExistingRetryCount(existingData) + 1;
    const nextRetryAt = Timestamp.fromDate(buildNextRetryDate(new Date(), retryCount));

    if (!options.dryRun && docRef) {
      if (status === "unavailable") {
        await deleteTranscriptSearchIndex(db, target.youtubeVideoId);
      }

      await docRef.set(
        buildTranscriptFailedDoc(
          target.youtubeVideoId,
          status,
          errorCode,
          errorMessage,
          getAvailableLanguagesFromError(error),
          retryCount,
          now,
          nextRetryAt
        ),
        { merge: true }
      );
    }

    return {
      errorCode,
      errorMessage,
      status,
      youtubeVideoId: target.youtubeVideoId,
    };
  }
}
