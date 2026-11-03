import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { debugWarn } from "../lib/debug.js";
import { CALLABLE_OPTS, FUNCTIONS_SERVICE_ACCOUNT } from "../lib/shared.js";
import { loadAccounts } from "./accounts.js";
import { ZoomClient } from "./client.js";
import type { AttendanceConfig } from "./model.js";
import { DAY, MINUTE } from "./logic.js";
import { loadEvents } from "./store.js";
import { syncEvent } from "./sync.js";

export {
  getZoomAttendance,
  setZoomAttendanceConnection,
  syncZoomAttendance,
  matchZoomAttendanceParticipant,
  getMyZoomAttendance,
} from "./callables.js";

export const pollZoomAttendance = onSchedule(
  {
    ...CALLABLE_OPTS,
    serviceAccount: FUNCTIONS_SERVICE_ACCOUNT,
    schedule: "every 30 minutes",
    timeZone: "Europe/Moscow",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    const deadline = Date.now() + 7 * MINUTE;
    const accounts = await loadAccounts().catch(() => null);
    if (!accounts) {
      debugWarn("Zoom attendance: server connection is not configured.");
      return;
    }
    const clients = new Map(accounts.map((a) => [a.key, new ZoomClient(a)]));
    const configs = await getFirestore()
      .collection("zoomAttendanceGroups")
      .get();
    // Least recently polled groups go first if the time budget was exhausted last run.
    const groups = [...configs.docs].sort(
      (a, b) => (a.data().lastPolledAtMs ?? 0) - (b.data().lastPolledAtMs ?? 0),
    );
    for (const group of groups) {
      if (Date.now() > deadline) break;
      const config = group.data() as AttendanceConfig;
      const client = config.accountKey
        ? clients.get(config.accountKey)
        : undefined;
      if (!client) continue;
      const source = await getFirestore()
        .collection("groups")
        .doc(group.id)
        .get();
      if (!source.exists || source.data()?.isSystem) continue;
      try {
        const events = await loadEvents(group.id);
        for (const event of [...events].reverse()) {
          if (Date.now() > deadline) break;
          if (
            event.endAtMs > Date.now() - 30 * MINUTE ||
            event.endAtMs < Date.now() - 7 * DAY
          )
            continue;
          await syncEvent(group.id, event, events, config, client);
        }
      } catch {
        debugWarn(
          "Zoom attendance: group polling failed; will retry next run.",
        );
      }
      await group.ref.set({ lastPolledAtMs: Date.now() }, { merge: true });
    }
  },
);
