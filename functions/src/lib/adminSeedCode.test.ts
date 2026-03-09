import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClientMock = vi.fn();
const requestMock = vi.fn();

vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn().mockImplementation(() => ({
    getClient: getClientMock,
  })),
}));

const { getAdminSeedCode, resetAdminSeedCodeCache } = await import("./adminSeedCode.js");

describe("getAdminSeedCode", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GCLOUD_PROJECT: "psych-dev-site-prod",
    };
    getClientMock.mockReset();
    requestMock.mockReset();
    resetAdminSeedCodeCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetAdminSeedCodeCache();
  });

  it("reads admin seed code from Secret Manager", async () => {
    getClientMock.mockResolvedValue({ request: requestMock });
    requestMock.mockResolvedValue({
      data: {
        payload: {
          data: Buffer.from("  secret-seed-code  ", "utf8").toString("base64"),
        },
      },
    });

    await expect(getAdminSeedCode()).resolves.toBe("secret-seed-code");
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("throws when secret is empty", async () => {
    getClientMock.mockResolvedValue({ request: requestMock });
    requestMock.mockResolvedValue({
      data: {
        payload: {
          data: Buffer.from("   ", "utf8").toString("base64"),
        },
      },
    });

    await expect(getAdminSeedCode()).rejects.toThrow("Secret admin-seed-code is empty");
  });

  it("caches secret reads", async () => {
    getClientMock.mockResolvedValue({ request: requestMock });
    requestMock.mockResolvedValue({
      data: {
        payload: {
          data: Buffer.from("seed-code", "utf8").toString("base64"),
        },
      },
    });

    await expect(getAdminSeedCode()).resolves.toBe("seed-code");
    await expect(getAdminSeedCode()).resolves.toBe("seed-code");
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
