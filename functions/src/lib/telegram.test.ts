import { afterEach, describe, expect, it, vi } from "vitest";
import { sendTelegramMessage } from "./telegram.js";

describe("sendTelegramMessage", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("throws when config is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    await expect(sendTelegramMessage("hi")).rejects.toThrow(
      "Telegram config missing: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"
    );
  });

  it("posts message to Telegram", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "test-chat";

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
});
