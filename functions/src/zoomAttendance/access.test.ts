import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetGroup } = vi.hoisted(() => ({ mockGetGroup: vi.fn() }));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({ get: () => mockGetGroup(name, id) }),
    }),
  }),
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = "HttpsError";
    }
  },
}));

vi.mock("../lib/shared.js", () => ({
  isSuperAdmin: (request: {
    auth?: { token?: { role?: string; email?: string } };
  }) =>
    request.auth?.token?.role === "super-admin" ||
    request.auth?.token?.email === "owner@example.test",
}));

import { documentId, requireGroup } from "./access.js";

const group = {
  memberIds: ["student-1"],
  announcementAdminIds: ["assigned-admin"],
};

function request(uid: string, token: Record<string, unknown> = {}) {
  return { auth: { uid, token } };
}

describe("zoom attendance access", () => {
  beforeEach(() => vi.resetAllMocks());

  it("validates Firestore document ids and rejects slash/path ids", () => {
    expect(documentId(" group-1 ", "groupId")).toBe(" group-1 ");
    for (const value of [null, "", "  ", "a/b", ".", "..", "x".repeat(201)]) {
      expect(() => documentId(value, "groupId")).toThrow(
        "Некорректное поле groupId",
      );
    }
  });

  it("allows group manager only for super-admin or assigned admin", async () => {
    mockGetGroup.mockResolvedValue({ exists: true, data: () => group });
    await expect(
      requireGroup(request("assigned-admin", { role: "admin" }), "g1"),
    ).resolves.toEqual(group);
    await expect(
      requireGroup(request("owner", { role: "super-admin" }), "g1"),
    ).resolves.toEqual(group);
    await expect(
      requireGroup(
        request("course-author", {
          role: "admin",
          editableCourses: ["development"],
        }),
        "g1",
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await expect(
      requireGroup(request("student-1", { role: "student" }), "g1"),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("member-only checks admit group members and deny admins who are not members", async () => {
    mockGetGroup.mockResolvedValue({ exists: true, data: () => group });
    await expect(
      requireGroup(request("student-1"), "g1", true),
    ).resolves.toEqual(group);
    await expect(
      requireGroup(request("assigned-admin", { role: "admin" }), "g1", true),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await expect(
      requireGroup(request("owner", { role: "super-admin" }), "g1", true),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("requires auth and hides missing or system groups", async () => {
    await expect(requireGroup({ auth: undefined }, "g1")).rejects.toMatchObject(
      { code: "unauthenticated" },
    );
    mockGetGroup.mockResolvedValueOnce({
      exists: false,
      data: () => undefined,
    });
    await expect(
      requireGroup(request("owner", { role: "super-admin" }), "missing"),
    ).rejects.toMatchObject({ code: "not-found" });
    mockGetGroup.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ...group, isSystem: true }),
    });
    await expect(
      requireGroup(request("owner", { role: "super-admin" }), "everyone"),
    ).rejects.toMatchObject({ code: "not-found" });
  });
});
