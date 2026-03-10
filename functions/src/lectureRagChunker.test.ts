import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  buildLectureKey,
  buildLectureRagChunkDocs,
  buildLectureRagChunks,
  buildLectureRagSourceDoc,
} from "../../shared/lectureRag/index.js";

describe("lecture rag chunker", () => {
  it("builds lecture chunks with timestamps", () => {
    const chunks = buildLectureRagChunks({
      availableLanguages: ["ru"],
      language: "ru",
      segments: [
        { index: 0, startMs: 5_000, endMs: 8_000, durationMs: 3_000, text: "Первый тезис" },
        { index: 1, startMs: 8_000, endMs: 12_000, durationMs: 4_000, text: "Второй тезис" },
      ],
    });

    expect(chunks).toEqual([
      expect.objectContaining({
        chunkIndex: 0,
        startMs: 5_000,
        endMs: 12_000,
        timestampLabel: "00:05",
      }),
    ]);
  });

  it("creates deterministic source and chunk docs", () => {
    const reference = {
      courseId: "development",
      lessonId: "intro",
      lessonTitle: "Введение",
      sourcePath: "intro/singleton",
      title: "Лекция 1",
      url: "https://youtu.be/video-123",
    };
    const lectureKey = buildLectureKey(reference, "video-123");
    const now = Timestamp.now();
    const transcript = {
      availableLanguages: ["ru"],
      language: "ru",
      segments: [
        { index: 0, startMs: 5_000, endMs: 8_000, durationMs: 3_000, text: "Первый тезис" },
      ],
    };
    const sourceDoc = buildLectureRagSourceDoc(reference, "video-123", transcript, 1, now);
    const chunkDocs = buildLectureRagChunkDocs(
      reference,
      "video-123",
      buildLectureRagChunks(transcript),
      [[0.1, 0.2]],
      now
    );

    expect(sourceDoc.lectureKey).toBe(lectureKey);
    expect(chunkDocs[0].id).toBe(`${lectureKey}::0`);
    expect(chunkDocs[0].data.embedding).toEqual([0.1, 0.2]);
  });
});
