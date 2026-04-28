import { describe, expect, it } from "vitest";
import {
  buildSearchTokens,
  buildTranscriptSearchChunkDocs,
  buildTranscriptSearchChunks,
  formatTranscriptTimestamp,
  TRANSCRIPT_STOP_WORDS,
  TRANSCRIPT_TOKEN_MIN_LENGTH,
} from "../../shared/videoTranscripts/index.js";

describe("buildSearchTokens", () => {
  it("builds prefix tokens from length 3 to full word length", () => {
    const tokens = buildSearchTokens("фрейд");
    expect(tokens).toEqual(["фре", "фрей", "фрейд"]);
  });

  it("processes multiple words and deduplicates overlapping prefixes", () => {
    const tokens = buildSearchTokens("психология психологический");
    expect(tokens).toContain("пси");
    expect(tokens).toContain("психология");
    expect(tokens).toContain("психологический");
    // dedup: "пси" / "псих" / "психо" / "психол" встречаются у обоих, считаем 1 раз
    expect(tokens.filter((t) => t === "психо")).toHaveLength(1);
  });

  it("ignores stop-words", () => {
    const tokens = buildSearchTokens("и или это");
    expect(tokens).toEqual([]);
  });

  it("ignores words shorter than minimum length", () => {
    const tokens = buildSearchTokens("сон ум я");
    // "сон" (3) индексируется, "ум" (2) и "я" (1) — нет
    expect(tokens).toContain("сон");
    expect(tokens).not.toContain("ум");
    expect(tokens).not.toContain("я");
  });

  it("splits on punctuation, whitespace and numbers boundaries", () => {
    const tokens = buildSearchTokens("фрейд, юнг! адлер?");
    expect(tokens).toContain("фрейд");
    expect(tokens).toContain("юнг");
    expect(tokens).toContain("адлер");
  });

  it("handles mixed russian and english", () => {
    const tokens = buildSearchTokens("Freud считал, что");
    expect(tokens).toContain("freud");
    expect(tokens).toContain("счи");
    expect(tokens).toContain("считал");
    // stop-words "что" — не должно быть
    expect(tokens).not.toContain("что");
  });

  it("preserves yo (ё) as part of word", () => {
    const tokens = buildSearchTokens("моё");
    // "моё" (3 chars) индексируется
    expect(tokens).toContain("моё");
  });

  it("handles empty / whitespace-only input", () => {
    expect(buildSearchTokens("")).toEqual([]);
    expect(buildSearchTokens("   ")).toEqual([]);
  });

  it("constants are exposed for endpoint reuse", () => {
    expect(TRANSCRIPT_TOKEN_MIN_LENGTH).toBe(3);
    expect(TRANSCRIPT_STOP_WORDS.has("и")).toBe(true);
    expect(TRANSCRIPT_STOP_WORDS.has("the")).toBe(true);
    expect(TRANSCRIPT_STOP_WORDS.has("психология")).toBe(false);
  });
});

describe("transcript search index builders", () => {
  it("builds compact search chunks with timestamps", () => {
    const chunks = buildTranscriptSearchChunks([
      { index: 0, startMs: 0, endMs: 4_000, durationMs: 4_000, text: "Первый тезис" },
      { index: 1, startMs: 4_000, endMs: 8_000, durationMs: 4_000, text: "вторая часть мысли" },
      { index: 2, startMs: 8_000, endMs: 12_000, durationMs: 4_000, text: "и завершение" },
      { index: 3, startMs: 12_000, endMs: 16_000, durationMs: 4_000, text: "ещё один блок" },
      { index: 4, startMs: 16_000, endMs: 20_000, durationMs: 4_000, text: "новый сегмент" },
    ]);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      startMs: 0,
      endMs: 16_000,
      segmentCount: 4,
      timestampLabel: "00:00",
    });
    expect(chunks[1]).toMatchObject({
      chunkIndex: 1,
      startMs: 16_000,
      timestampLabel: "00:16",
    });
  });

  it("creates chunk docs for every lecture reference", () => {
    const now = { seconds: 1 } as never;
    const payload = buildTranscriptSearchChunkDocs(
      {
        youtubeVideoId: "dQw4w9WgXcQ",
        references: [
          {
            courseId: "development",
            lessonId: "intro",
            lessonTitle: "Введение",
            sourcePath: "intro/singleton",
            title: "Вступительная лекция",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
          {
            courseId: "general",
            lessonId: "general-1",
            lessonTitle: "История психологии",
            sourcePath: "general-topics/general-1",
            title: "Вступительная лекция",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          },
        ],
      },
      {
        availableLanguages: ["ru"],
        language: "ru",
        segments: [
          { index: 0, startMs: 65_000, endMs: 70_000, durationMs: 5_000, text: "Развитие связано со временем" },
        ],
      },
      now
    );

    expect(payload.parentDoc.chunkCount).toBe(2);
    expect(payload.docs).toHaveLength(2);
    expect(payload.docs[0].data).toMatchObject({
      youtubeVideoId: "dQw4w9WgXcQ",
      courseId: "development",
      periodId: "intro",
      periodTitle: "Введение",
      lectureTitle: "Вступительная лекция",
      timestampLabel: "01:05",
    });
    expect(payload.docs[1].data).toMatchObject({
      courseId: "general",
      periodId: "general-1",
      periodTitle: "История психологии",
    });
  });

  it("formats long transcript timestamps with hours", () => {
    expect(formatTranscriptTimestamp(3_726_000)).toBe("01:02:06");
  });
});
