import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  deleteLectureRagForReference,
  upsertLectureRagForReference,
} from "../../shared/lectureRag/index.js";

function createMockFirestore() {
  const documents = new Map<string, Record<string, unknown>>();

  const createDocRef = (path: string): FirebaseFirestore.DocumentReference =>
    ({
      path,
      id: path.split("/").pop(),
      collection: (name: string) => createCollectionRef(`${path}/${name}`),
    }) as FirebaseFirestore.DocumentReference;

  const createCollectionRef = (path: string): FirebaseFirestore.CollectionReference =>
    ({
      path,
      doc: (id: string) => createDocRef(`${path}/${id}`),
      where: (field: string, _operator: string, value: string) => ({
        get: async () => ({
          docs: [...documents.entries()]
            .filter(([key, data]) => key.startsWith(`${path}/`) && data[field] === value)
            .map(([key]) => ({ ref: createDocRef(key) })),
        }),
      }),
    }) as unknown as FirebaseFirestore.CollectionReference;

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

describe("lecture rag persistence", () => {
  it("upserts source and chunk docs", async () => {
    const { db, documents } = createMockFirestore();

    await upsertLectureRagForReference(
      db,
      {
        courseId: "development",
        lessonId: "intro",
        lessonTitle: "Введение",
        sourcePath: "intro/singleton",
        title: "Лекция 1",
        url: "https://youtu.be/video-123",
      },
      "video-123",
      {
        availableLanguages: ["ru"],
        language: "ru",
        segments: [
          { index: 0, startMs: 5_000, endMs: 8_000, durationMs: 3_000, text: "Первый тезис" },
        ],
      },
      [[0.1, 0.2]],
      Timestamp.now()
    );

    expect(documents.has("lecture_sources/development::intro::video-123")).toBe(true);
    expect(
      [...documents.keys()].some((key) =>
        key.startsWith("lecture_chunks/development::intro::video-123::0")
      )
    ).toBe(true);
  });

  it("replaces stale lecture chunks", async () => {
    const { db, documents } = createMockFirestore();
    documents.set("lecture_chunks/development::intro::video-123::stale", {
      lectureKey: "development::intro::video-123",
    });

    await upsertLectureRagForReference(
      db,
      {
        courseId: "development",
        lessonId: "intro",
        lessonTitle: "Введение",
        sourcePath: "intro/singleton",
        title: "Лекция 1",
        url: "https://youtu.be/video-123",
      },
      "video-123",
      {
        availableLanguages: ["ru"],
        language: "ru",
        segments: [
          { index: 0, startMs: 5_000, endMs: 8_000, durationMs: 3_000, text: "Первый тезис" },
        ],
      },
      [[0.1, 0.2]],
      Timestamp.now()
    );

    expect(documents.has("lecture_chunks/development::intro::video-123::stale")).toBe(false);
  });

  it("deletes source and chunks", async () => {
    const { db, documents } = createMockFirestore();
    documents.set("lecture_sources/development::intro::video-123", {
      lectureKey: "development::intro::video-123",
    });
    documents.set("lecture_chunks/development::intro::video-123::0", {
      lectureKey: "development::intro::video-123",
    });

    await deleteLectureRagForReference(db, "development::intro::video-123");

    expect(
      [...documents.keys()].filter((key) => key.includes("development::intro::video-123"))
    ).toHaveLength(0);
  });
});
