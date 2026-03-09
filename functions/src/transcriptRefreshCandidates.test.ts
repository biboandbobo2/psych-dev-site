import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { getTranscriptRefreshReason } from "./transcriptRefreshCandidates.js";

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
