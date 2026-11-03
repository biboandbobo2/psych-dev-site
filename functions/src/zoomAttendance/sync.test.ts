import { beforeEach, describe, expect, it, vi } from "vitest";

const { records, batchFailure, publishedRows } = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(),
  batchFailure: { value: false },
  publishedRows: [] as number[],
}));

vi.mock("firebase-admin/firestore", () => {
  function ref(path: string): any {
    return {
      path,
      id: path.split("/").pop(),
      collection: (name: string) => ({
        doc: (id: string) => ref(`${path}/${name}/${id}`),
      }),
    };
  }
  const read = (r: any) => ({
    exists: records.has(r.path),
    data: () => records.get(r.path),
  });
  const write = (r: any, value: any, options?: any) => {
    if (value.activeSnapshot)
      publishedRows.push(
        [...records.keys()].filter((key) =>
          key.includes(`/snapshots/${value.activeSnapshot}/participants/`),
        ).length,
      );
    records.set(
      r.path,
      options?.merge ? { ...records.get(r.path), ...value } : value,
    );
  };
  return {
    getFirestore: () => ({
      collection: (name: string) => ({
        doc: (id: string) => ref(`${name}/${id}`),
      }),
      runTransaction: async (fn: any) => {
        const writes: Array<() => void> = [];
        const result = await fn({
          get: async (r: any) => read(r),
          set: (r: any, value: any, options?: any) =>
            writes.push(() => write(r, value, options)),
        });
        writes.forEach((apply) => apply());
        return result;
      },
      batch: () => {
        const writes: Array<() => void> = [];
        return {
          set: (r: any, value: any) => writes.push(() => write(r, value)),
          commit: async () => {
            if (batchFailure.value)
              throw new Error("sensitive transport error");
            writes.forEach((apply) => apply());
          },
        };
      },
    }),
  };
});

vi.mock("firebase-admin/auth", () => ({ getAuth: vi.fn() }));
import { syncEvent } from "./sync.js";
import { DAY, MINUTE } from "./logic.js";
import { ZoomApiError, type ZoomClient } from "./client.js";
import type { AttendanceConfig, AttendanceEvent } from "./model.js";

const now = Date.now();
const event: AttendanceEvent = {
  id: "event",
  title: "Урок",
  meetingId: "123456789",
  startAtMs: now - 3 * 60 * MINUTE,
  endAtMs: now - 2 * 60 * MINUTE,
};
const config: AttendanceConfig = {
  accountKey: "primary",
  minPercent: 50,
  updatedAtMs: now,
};
const path = "zoomAttendanceGroups/group/sessions/event";
function client() {
  return {
    instances: vi
      .fn()
      .mockResolvedValue([
        {
          uuid: "session",
          start_time: new Date(event.startAtMs).toISOString(),
        },
      ]),
    report: vi
      .fn()
      .mockResolvedValue({
        uuid: "session",
        start_time: new Date(event.startAtMs).toISOString(),
        end_time: new Date(event.endAtMs).toISOString(),
        participants: [
          {
            participant_user_id: "stable",
            name: "Ученик",
            join_time: new Date(event.startAtMs).toISOString(),
            leave_time: new Date(event.endAtMs).toISOString(),
          },
        ],
      }),
  };
}
const run = (c: ReturnType<typeof client>, force = false) =>
  syncEvent("group", event, [event], config, c as unknown as ZoomClient, force);

beforeEach(() => {
  records.clear();
  publishedRows.length = 0;
  batchFailure.value = false;
  records.set("zoomAttendanceGroups/group", { ...config });
});

describe("attendance import publication", () => {
  it("publishes a complete snapshot and skips the next scheduled import", async () => {
    const c = client();
    expect(await run(c)).toBe(true);
    expect(records.get(path)).toMatchObject({
      status: "ready",
      accountKey: "primary",
      message: null,
    });
    expect(publishedRows).toEqual([1]);
    expect(await run(c)).toBe(false);
    expect(c.report).toHaveBeenCalledTimes(1);
  });

  it("never marks an empty or incomplete Zoom report as absence", async () => {
    const c = client();
    c.report.mockResolvedValueOnce({
      uuid: "session",
      start_time: "",
      end_time: new Date(event.endAtMs).toISOString(),
      participants: [],
    });
    await run(c);
    expect(records.get(path)).toMatchObject({
      status: "pending",
      activeSnapshot: null,
    });
    expect(publishedRows).toEqual([]);
  });

  it("does not publish a snapshot when a Firestore batch fails", async () => {
    batchFailure.value = true;
    await run(client());
    expect(records.get(path)).toMatchObject({
      status: "error",
      activeSnapshot: null,
    });
    expect(JSON.stringify(records.get(path))).not.toContain(
      "sensitive transport",
    );
    expect(publishedRows).toEqual([]);
  });

  it("keeps the previous complete report on a transient refresh failure", async () => {
    records.set(path, {
      accountKey: "primary",
      meetingId: event.meetingId,
      eventStartMs: event.startAtMs,
      eventEndMs: event.endAtMs,
      status: "ready",
      activeSnapshot: "old",
      syncedAtMs: now - DAY,
      lastAttemptMs: now - DAY,
    });
    const c = client();
    c.report.mockRejectedValueOnce(new ZoomApiError(429, 4001, 3600));
    await run(c, true);
    expect(records.get(path)).toMatchObject({
      status: "ready",
      activeSnapshot: "old",
      syncedAtMs: now - DAY,
    });
    expect(Number(records.get(path)?.retryAfterMs)).toBeGreaterThanOrEqual(
      now + 3600_000,
    );
  });

  it("blocks concurrent/cooldown imports and ignores a disconnected account", async () => {
    records.set(path, { leaseUntilMs: now + MINUTE });
    const c = client();
    expect(await run(c, true)).toBe(false);
    records.clear();
    records.set("zoomAttendanceGroups/group", { ...config, accountKey: null });
    expect(await run(c)).toBe(false);
    expect(c.instances).not.toHaveBeenCalled();
  });

  it("fetches every matching occurrence rather than only the latest recurring meeting", async () => {
    const c = client();
    c.instances.mockResolvedValueOnce([
      { uuid: "session", start_time: new Date(event.startAtMs).toISOString() },
      {
        uuid: "restarted",
        start_time: new Date(event.startAtMs + 30 * MINUTE).toISOString(),
      },
    ]);
    c.report.mockImplementation(async (uuid) => ({
      uuid,
      start_time: new Date(event.startAtMs).toISOString(),
      end_time: new Date(event.endAtMs).toISOString(),
      participants: [
        {
          participant_user_id: "stable",
          name: "Ученик",
          join_time: new Date(event.startAtMs).toISOString(),
          leave_time: new Date(event.endAtMs).toISOString(),
        },
      ],
    }));
    await run(c);
    expect(c.report.mock.calls).toEqual([["session"], ["restarted"]]);
    expect(publishedRows).toEqual([1]);
  });

  it("does not publish if the connection changed while Zoom was responding", async () => {
    const c = client();
    c.report.mockImplementationOnce(async () => {
      records.set("zoomAttendanceGroups/group", {
        ...config,
        accountKey: "different",
      });
      return {
        uuid: "session",
        start_time: new Date(event.startAtMs).toISOString(),
        end_time: new Date(event.endAtMs).toISOString(),
        participants: [
          {
            participant_user_id: "stable",
            name: "Ученик",
            join_time: new Date(event.startAtMs).toISOString(),
            leave_time: new Date(event.endAtMs).toISOString(),
          },
        ],
      };
    });
    await run(c);
    expect(records.get(path)?.status).not.toBe("ready");
    expect(publishedRows).toEqual([]);
  });
});
