import { afterEach, describe, expect, it } from "vitest";
import { getTranscriptRefreshConfigFromEnv } from "./transcriptRefreshConfig.js";

const ORIGINAL_ENV = { ...process.env };

describe("getTranscriptRefreshConfigFromEnv", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses defaults when env is not set", () => {
    delete process.env.TRANSCRIPT_REFRESH_BATCH_SIZE;
    delete process.env.TRANSCRIPT_REFRESH_LANGS;

    const config = getTranscriptRefreshConfigFromEnv();

    expect(config.batchSize).toBe(25);
    expect(config.langs).toEqual(["ru", "en"]);
    expect(config.timeZone).toBe("Asia/Tbilisi");
  });

  it("parses custom env values", () => {
    process.env.TRANSCRIPT_REFRESH_BATCH_SIZE = "10";
    process.env.TRANSCRIPT_REFRESH_LANGS = "ru,en,es";
    process.env.TRANSCRIPT_REFRESH_CRON = "0 6 * * 0";
    process.env.TRANSCRIPT_REFRESH_TIME_ZONE = "UTC";

    const config = getTranscriptRefreshConfigFromEnv();

    expect(config.batchSize).toBe(10);
    expect(config.langs).toEqual(["ru", "en", "es"]);
    expect(config.schedule).toBe("0 6 * * 0");
    expect(config.timeZone).toBe("UTC");
  });
});
