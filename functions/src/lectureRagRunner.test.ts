import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import {
  getLectureRagProcessableReferences,
  ingestLectureRagTarget,
  LECTURE_RAG_SOURCES_COLLECTION,
} from "../../shared/lectureRag/index.js";
import { VIDEO_TRANSCRIPTS_COLLECTION } from "../../shared/videoTranscripts/index.js";

function createMockFirestore() {
  const documents = new Map<string, Record<string, unknown>>();

  const createDocRef = (path: string): FirebaseFirestore.DocumentReference =>
    ({
      path,
      id: path.split("/").pop(),
      get: async () => ({
        exists: documents.has(path),
        data: () => documents.get(path),
        ref: createDocRef(path),
      }),
    }) as unknown as FirebaseFirestore.DocumentReference;

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

  return {
    db: {
      batch: () => {
        const operations: Array<() => void> = [];
        return {
          commit: async () => {
            operations.forEach((operation) => operation());
          },
          delete: (ref: FirebaseFirestore.DocumentReference) => {
            operations.push(() => {
              documents.delete(ref.path);
            });
          },
          set: (ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>) => {
            operations.push(() => {
              documents.set(ref.path, data);
            });
          },
        } as FirebaseFirestore.WriteBatch;
      },
      collection: (name: string) => createCollectionRef(name),
    } as unknown as FirebaseFirestore.Firestore,
    documents,
  };
}

describe("lecture rag runner", () => {
  it("пропускает уже ingest-нутые lecture sources", async () => {
    const { db, documents } = createMockFirestore();
    documents.set(`${LECTURE_RAG_SOURCES_COLLECTION}/development::intro::video-123`, {
      lectureKey: "development::intro::video-123",
    });

    const references = await getLectureRagProcessableReferences(
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
          {
            courseId: "development",
            lessonId: "seminary",
            lessonTitle: "Семинары",
            sourcePath: "courses/development/lessons/seminary",
            title: "Лекция 1",
            url: "https://youtu.be/video-123",
          },
        ],
      },
      false
    );

    expect(references).toHaveLength(1);
    expect(references[0].lessonId).toBe("seminary");
  });

  it("загружает transcript из storage и сохраняет lecture chunks", async () => {
    const { db, documents } = createMockFirestore();
    documents.set(`${VIDEO_TRANSCRIPTS_COLLECTION}/video-123`, {
      status: "available",
      storagePath: "video-transcripts/video-123/transcript.v1.json",
    });

    const bucket = {
      file: () => ({
        download: async () =>
          [
            new TextEncoder().encode(
              JSON.stringify({
                availableLanguages: ["ru"],
                language: "ru",
                segments: [
                  {
                    durationMs: 3_000,
                    endMs: 8_000,
                    index: 0,
                    startMs: 5_000,
                    text: "Первый тезис",
                  },
                ],
              })
            ),
          ] as [Uint8Array],
      }),
    } as any;

    const getEmbeddingsBatchMock = vi.fn().mockResolvedValue([[0.1, 0.2]]);

    const result = await ingestLectureRagTarget(
      {
        bucket,
        db,
        getEmbeddingsBatch: getEmbeddingsBatchMock,
      },
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
        force: true,
        now: Timestamp.now(),
      }
    );

    expect(result.status).toBe("processed");
    expect(result.chunkCount).toBe(1);
    expect(getEmbeddingsBatchMock).toHaveBeenCalledWith(["Первый тезис"], undefined);
    expect(
      documents.has("lecture_sources/development::intro::video-123")
    ).toBe(true);
  });
});
