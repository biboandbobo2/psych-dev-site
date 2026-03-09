import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClientMock = vi.fn();
const requestMock = vi.fn();

vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({
    getClient: getClientMock,
  })),
}));

const { resetTelegramConfigCache, sendTelegramMessage } = await import("./telegram.js");

describe("sendTelegramMessage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    getClientMock.mockReset();
    requestMock.mockReset();
    resetTelegramConfigCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    resetTelegramConfigCache();
  });

  it("throws when neither secrets nor env config are available", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.GCLOUD_PROJECT;
    getClientMock.mockRejectedValue(new Error("no auth"));

    await expect(sendTelegramMessage("hi")).rejects.toThrow(
      "Telegram config missing: Secret Manager"
    );
  });

  it("falls back to env config when secrets are unavailable", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "test-chat";
    process.env.GCLOUD_PROJECT = "psych-dev-site-prod";
    getClientMock.mockRejectedValue(new Error("secret manager unavailable"));

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage("hello");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("test-token");
    expect(options.body).toContain("test-chat");
  });

  it("prefers Secret Manager config when available", async () => {
    process.env.GCLOUD_PROJECT = "psych-dev-site-prod";
    getClientMock.mockResolvedValue({ request: requestMock });
    requestMock
      .mockResolvedValueOnce({
        data: {
          payload: {
            data: Buffer.from("secret-token", "utf8").toString("base64"),
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          payload: {
            data: Buffer.from("secret-chat", "utf8").toString("base64"),
          },
        },
      });

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 456 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage("hello");

    expect(requestMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("secret-token");
    expect(options.body).toContain("secret-chat");
  });
});
