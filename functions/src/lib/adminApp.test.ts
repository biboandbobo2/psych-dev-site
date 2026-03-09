import { afterEach, describe, expect, it } from "vitest";
import {
  resolveAdminProjectId,
  resolveAdminStorageBucket,
} from "./adminApp.js";

const ORIGINAL_ENV = { ...process.env };

describe("adminApp env resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers explicit storage bucket env vars", () => {
    process.env.GCLOUD_PROJECT = "psych-dev-site-prod";
    process.env.FIREBASE_STORAGE_BUCKET = "custom.firebasestorage.app";

    expect(resolveAdminStorageBucket()).toBe("custom.firebasestorage.app");
  });

  it("uses FIREBASE_CONFIG storage bucket when present", () => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId: "psych-dev-site-prod",
      storageBucket: "from-config.firebasestorage.app",
    });

    expect(resolveAdminProjectId()).toBe("psych-dev-site-prod");
    expect(resolveAdminStorageBucket()).toBe("from-config.firebasestorage.app");
  });

  it("falls back to firebasestorage bucket from project id", () => {
    process.env.GCLOUD_PROJECT = "psych-dev-site-prod";
    delete process.env.FIREBASE_STORAGE_BUCKET;
    delete process.env.VITE_FIREBASE_STORAGE_BUCKET;
    delete process.env.FIREBASE_CONFIG;

    expect(resolveAdminStorageBucket()).toBe(
      "psych-dev-site-prod.firebasestorage.app"
    );
  });
});
