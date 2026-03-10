import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  deleteTranscriptSearchIndex,
  upsertTranscriptSearchIndex,
} from "../../shared/videoTranscripts/index.js";

function createMockFirestore() {
  const documents = new Map<string, Record<string, unknown>>();

  const createDocRef = (path: string): FirebaseFirestore.DocumentReference =>
    ({
      path,
      collection: (name: string) => createCollectionRef(`${path}/${name}`),
    }) as FirebaseFirestore.DocumentReference;

  const createCollectionRef = (path: string): FirebaseFirestore.CollectionReference =>
    ({
      path,
      doc: (id: string) => createDocRef(`${path}/${id}`),
      listDocuments: async () => {
        const depth = path.split("/").length + 1;
        return [...documents.keys()]
          .filter((key) => key.startsWith(`${path}/`) && key.split("/").length === depth)
          .map((key) => createDocRef(key));
      },
    }) as FirebaseFirestore.CollectionReference;

  const db = {
    collection: (name: string) => createCollectionRef(name),
    batch: () => {
      const operations: Array<() => void> = [];

      return {
        set: (
          ref: FirebaseFirestore.DocumentReference,
          data: Record<string, unknown>
        ) => {
          operations.push(() => {
            documents.set(ref.path, data);
          });
        },
        delete: (ref: FirebaseFirestore.DocumentReference) => {
          operations.push(() => {
            documents.delete(ref.path);
          });
        },
        commit: async () => {
          operations.forEach((operation) => operation());
        },
      } as FirebaseFirestore.WriteBatch;
    },
  } as unknown as FirebaseFirestore.Firestore;

  return {
    db,
    documents,
  };
}

describe("transcript search persistence", () => {
  it("upserts parent doc and chunk docs for transcript search", async () => {
    const { db, documents } = createMockFirestore();

    await upsertTranscriptSearchIndex(
      db,
      {
        youtubeVideoId: "video-123",
        references: [
          {
            courseId: "development",
            lessonId: "intro",
            lessonTitle: "Введение",
            sourcePath: "intro/singleton",
            title: "Лекция 1",
            url: "https://youtu.be/video-123",
          },
        ],
      },
      {
        availableLanguages: ["ru"],
        language: "ru",
        segments: [
          { index: 0, startMs: 5_000, endMs: 7_000, durationMs: 2_000, text: "Первый тезис" },
          { index: 1, startMs: 7_000, endMs: 10_000, durationMs: 3_000, text: "второй тезис" },
        ],
      },
      Timestamp.now()
    );

    expect(documents.has("videoTranscriptSearch/video-123")).toBe(true);
    const chunkEntries = [...documents.keys()].filter((key) =>
      key.startsWith("videoTranscriptSearch/video-123/searchChunks/")
    );
    expect(chunkEntries).toHaveLength(1);
  });

  it("deletes stale chunk docs before writing a fresh index", async () => {
    const { db, documents } = createMockFirestore();
    documents.set("videoTranscriptSearch/video-123", { youtubeVideoId: "video-123" });
    documents.set("videoTranscriptSearch/video-123/searchChunks/stale", { text: "stale" });

    await upsertTranscriptSearchIndex(
      db,
      {
        youtubeVideoId: "video-123",
        references: [
          {
            courseId: "general",
            lessonId: "general-1",
            lessonTitle: "История психологии",
            sourcePath: "general-topics/general-1",
            title: "Лекция 2",
            url: "https://youtu.be/video-123",
          },
        ],
      },
      {
        availableLanguages: ["ru"],
        language: "ru",
        segments: [
          { index: 0, startMs: 10_000, endMs: 12_000, durationMs: 2_000, text: "Новый текст" },
        ],
      },
      Timestamp.now()
    );

    expect(documents.has("videoTranscriptSearch/video-123/searchChunks/stale")).toBe(false);
    expect(
      [...documents.keys()].some((key) =>
        key.startsWith("videoTranscriptSearch/video-123/searchChunks/general::general-1::0::0")
      )
    ).toBe(true);
  });

  it("removes transcript search parent doc and chunks", async () => {
    const { db, documents } = createMockFirestore();
    documents.set("videoTranscriptSearch/video-123", { youtubeVideoId: "video-123" });
    documents.set("videoTranscriptSearch/video-123/searchChunks/chunk-1", { text: "test" });

    await deleteTranscriptSearchIndex(db, "video-123");

    expect(
      [...documents.keys()].filter((key) => key.startsWith("videoTranscriptSearch/video-123"))
    ).toHaveLength(0);
  });
});
