import { describe, expect, it, vi } from "vitest";
import { ZoomApiError, ZoomClient, type ZoomCredentials } from "./client.js";

const credentials: ZoomCredentials = {
  accountId: "account-id",
  clientId: "client-id",
  clientSecret: "client-secret-private",
};

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function tokenResponse(accessToken: string, expiresIn = 3600): Response {
  return jsonResponse({ access_token: accessToken, expires_in: expiresIn });
}

function authFetch(
  routes: (url: URL, init: RequestInit) => Response | Promise<Response>,
) {
  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) =>
    routes(new URL(String(input)), init),
  ) as unknown as typeof fetch;
}

describe("ZoomClient", () => {
  it("requests date-bounded instances and maps Zoom's meetings array", async () => {
    const fetchImpl = authFetch((url) => {
      if (url.hostname === "zoom.us") return tokenResponse("token");
      expect(url.pathname).toBe("/v2/past_meetings/123/instances");
      expect(url.searchParams.get("from")).toBe("2026-10-01");
      expect(url.searchParams.get("to")).toBe("2026-10-31");
      return jsonResponse({
        meetings: [
          { uuid: "meeting-uuid", start_time: "2026-10-12T12:00:00Z" },
        ],
      });
    });

    const result = await new ZoomClient(credentials, fetchImpl).instances(
      "123",
      Date.parse("2026-10-01T00:00:00Z"),
      Date.parse("2026-10-31T23:59:59Z"),
    );
    expect(result).toEqual([
      { uuid: "meeting-uuid", start_time: "2026-10-12T12:00:00Z" },
    ]);
  });

  it.each([
    ["ordinary-uuid", "ordinary-uuid"],
    ["/leading/uuid", "%252Fleading%252Fuuid"],
    ["contains//double", "contains%252F%252Fdouble"],
  ])("encodes UUID path safely (%s)", async (uuid, expectedPathPart) => {
    const fetchImpl = authFetch((url) => {
      if (url.hostname === "zoom.us") return tokenResponse("token");
      if (url.pathname.endsWith("/participants"))
        return jsonResponse({
          participants: [],
          total_records: 0,
          next_page_token: "",
        });
      expect(url.pathname).toContain(expectedPathPart);
      return jsonResponse({ uuid, start_time: "start", end_time: "end" });
    });
    await new ZoomClient(credentials, fetchImpl).report(uuid);
    const calledUrls = vi
      .mocked(fetchImpl)
      .mock.calls.map(([input]) => String(input));
    expect(
      calledUrls
        .filter((url) => url.startsWith("https://api.zoom.us/"))
        .every((url) => new URL(url).hostname === "api.zoom.us"),
    ).toBe(true);
  });

  it("collects every participant page without deduplicating reconnections", async () => {
    let participantPage = 0;
    const fetchImpl = authFetch((url) => {
      if (url.hostname === "zoom.us") return tokenResponse("token");
      if (url.pathname.endsWith("/participants")) {
        expect(url.searchParams.get("page_size")).toBe("300");
        participantPage += 1;
        return participantPage === 1
          ? jsonResponse({
              participants: [{ id: "p1", duration: 30 }],
              total_records: 2,
              next_page_token: "next page",
            })
          : jsonResponse({
              participants: [{ id: "p1", duration: 20 }],
              total_records: 2,
              next_page_token: "",
            });
      }
      return jsonResponse({ uuid: "u", start_time: "start", end_time: "end" });
    });

    const result = await new ZoomClient(credentials, fetchImpl).report("u");
    expect(result).toEqual({
      uuid: "u",
      start_time: "start",
      end_time: "end",
      participants: [
        { id: "p1", duration: 30 },
        { id: "p1", duration: 20 },
      ],
    });
    expect(participantPage).toBe(2);
  });

  it("refreshes an expired API token once after 401", async () => {
    let tokenCount = 0;
    let apiCount = 0;
    const fetchImpl = authFetch((url, init) => {
      if (url.hostname === "zoom.us") {
        tokenCount += 1;
        return tokenResponse(`token-${tokenCount}`);
      }
      apiCount += 1;
      if (apiCount === 1) {
        expect(new Headers(init.headers).get("authorization")).toBe(
          "Bearer token-1",
        );
        return jsonResponse({}, 401);
      }
      expect(new Headers(init.headers).get("authorization")).toBe(
        "Bearer token-2",
      );
      return jsonResponse({ meetings: [] });
    });

    await expect(
      new ZoomClient(credentials, fetchImpl).instances("123", 0, 1),
    ).resolves.toEqual([]);
    expect(tokenCount).toBe(2);
    expect(apiCount).toBe(2);
  });

  it("exposes only safe error metadata and never echoes credentials or response text", async () => {
    const fetchImpl = authFetch((url) =>
      url.hostname === "zoom.us"
        ? tokenResponse("token")
        : jsonResponse({ code: 429, message: credentials.clientSecret }, 429, {
            "retry-after": "17",
          }),
    );
    const client = new ZoomClient(credentials, fetchImpl);
    let caught: unknown;
    try {
      await client.instances("123", 0, 1);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ZoomApiError);
    expect(caught).toMatchObject({ status: 429, code: 429, retryAfterSec: 17 });
    expect(String(caught)).not.toContain(credentials.accountId);
    expect(String(caught)).not.toContain(credentials.clientId);
    expect(String(caught)).not.toContain(credentials.clientSecret);
  });

  it("rejects the whole report when a later participant page fails", async () => {
    let participantPage = 0;
    const fetchImpl = authFetch((url) => {
      if (url.hostname === "zoom.us") return tokenResponse("token");
      if (url.pathname.endsWith("/participants")) {
        participantPage += 1;
        return participantPage === 1
          ? jsonResponse({
              participants: [{ id: "first-page" }],
              total_records: 2,
              next_page_token: "next",
            })
          : jsonResponse(
              { code: 300, message: "private upstream detail" },
              500,
            );
      }
      return jsonResponse({ uuid: "u", start_time: "start", end_time: "end" });
    });

    await expect(
      new ZoomClient(credentials, fetchImpl).report("u"),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("fails closed when participant pagination exceeds the limit", async () => {
    const fetchImpl = authFetch((url) => {
      if (url.hostname === "zoom.us") return tokenResponse("token");
      if (url.pathname.endsWith("/participants")) {
        const token = Number(url.searchParams.get("next_page_token") ?? 0);
        return jsonResponse({
          participants: [{ id: `p-${token}` }],
          total_records: 10_000,
          next_page_token: String(token + 1),
        });
      }
      return jsonResponse({ uuid: "u", start_time: "start", end_time: "end" });
    });
    await expect(
      new ZoomClient(credentials, fetchImpl).report("u"),
    ).rejects.toBeInstanceOf(ZoomApiError);
  });

  it.each([
    { participants: [{ id: "only-one" }] },
    { participants: [{ id: "only-one" }], next_page_token: 123 },
    {
      participants: [{ id: "only-one" }],
      total_records: 2,
      next_page_token: "",
    },
  ])(
    "rejects malformed or truncated pagination instead of returning partial attendance",
    async (page) => {
      const fetchImpl = authFetch((url) => {
        if (url.hostname === "zoom.us") return tokenResponse("token");
        if (url.pathname.endsWith("/participants")) return jsonResponse(page);
        return jsonResponse({
          uuid: "u",
          start_time: "start",
          end_time: "end",
        });
      });
      await expect(
        new ZoomClient(credentials, fetchImpl).report("u"),
      ).rejects.toBeInstanceOf(ZoomApiError);
    },
  );

  it("sanitizes network failures before they can expose request details", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(
        new Error(credentials.clientSecret),
      ) as unknown as typeof fetch;
    await expect(
      new ZoomClient(credentials, fetchImpl).instances("123", 0, 1),
    ).rejects.toThrow("Не удалось получить данные Zoom");
  });
});
