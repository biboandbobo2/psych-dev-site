import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

const collectTranscriptTargetsMock = vi.fn();

vi.mock("../../shared/videoTranscripts/index.js", () => ({
  collectTranscriptTargets: collectTranscriptTargetsMock,
}));

const {
  collectTranscriptRefreshCandidates,
  getTranscriptRefreshReason,
} = await import("./transcriptRefreshCandidates.js");

describe("getTranscriptRefreshReason", () => {
  const now = Timestamp.fromMillis(1_700_000_000_000);

  it("retries missing transcript docs", () => {
    expect(getTranscriptRefreshReason(undefined, now)).toBe("missing");
  });

  it("retries unavailable doc when nextRetryAt is due", () => {
    expect(
      getTranscriptRefreshReason(
        {
          status: "unavailable",
          nextRetryAt: Timestamp.fromMillis(now.toMillis() - 1),
        },
        now
      )
    ).toBe("unavailable");
  });

  it("skips unavailable doc before nextRetryAt", () => {
    expect(
      getTranscriptRefreshReason(
        {
          status: "unavailable",
          nextRetryAt: Timestamp.fromMillis(now.toMillis() + 60_000),
        },
        now
      )
    ).toBeNull();
  });

  it("skips already available transcript", () => {
    expect(
      getTranscriptRefreshReason(
        {
          status: "available",
        },
        now
      )
    ).toBeNull();
  });
});

describe("collectTranscriptRefreshCandidates", () => {
  const now = Timestamp.fromMillis(1_700_000_000_000);

  beforeEach(() => {
    collectTranscriptTargetsMock.mockReset();
  });

  it("читает transcript docs батчами, если видео больше лимита одного getAll", async () => {
    const targets = Array.from({ length: 401 }, (_, index) => ({
      sourcePath: `periods/item-${index}`,
      title: `Video ${index}`,
      url: `https://www.youtube.com/watch?v=video-${index}`,
      youtubeVideoId: `video-${index}`,
    }));
    collectTranscriptTargetsMock.mockResolvedValue(targets);

    const getAllMock = vi.fn().mockResolvedValue([]);
    const db = {
      collection: () => ({
        doc: (id: string) => ({ id }),
      }),
      getAll: getAllMock,
    } as unknown as FirebaseFirestore.Firestore;

    await collectTranscriptRefreshCandidates(db, now, 10);

    expect(getAllMock).toHaveBeenCalledTimes(2);
    expect(getAllMock.mock.calls[0]).toHaveLength(400);
    expect(getAllMock.mock.calls[1]).toHaveLength(1);
  });
});
