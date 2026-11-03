import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { ZoomApiError, ZoomClient, type ZoomReport } from "./client.js";
import type {
  AttendanceConfig,
  AttendanceEvent,
  AttendanceSession,
} from "./model.js";
import { buildRows, DAY, MINUTE, selectInstances } from "./logic.js";
import { groupRef, sessionMatches, sessionRef } from "./store.js";

class PendingReport extends Error {}

function publicMessage(error: unknown): string {
  if (error instanceof PendingReport) return error.message;
  if (error instanceof ZoomApiError) {
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.code === 200 ||
      error.code === 4711
    ) {
      return "Проверьте активацию приложения Zoom и разрешения на чтение отчётов.";
    }
    if (error.status === 404 || error.code === 3001)
      return "Отчёт Zoom ещё не готов или встреча недоступна этому аккаунту.";
    if (error.status === 429)
      return "Zoom ограничил частоту запросов. Система повторит запрос позже.";
    return "Не удалось получить полный отчёт Zoom. Система повторит запрос позже.";
  }
  return "Не удалось обработать отчёт. Проверьте время занятия и настройки Zoom.";
}

/** Lease + immutable snapshot: interrupted imports never publish partial attendance. */
export async function syncEvent(
  groupId: string,
  event: AttendanceEvent,
  siblings: AttendanceEvent[],
  config: AttendanceConfig,
  client: ZoomClient,
  force = false,
): Promise<boolean> {
  const ref = sessionRef(groupId, event.id);
  const db = getFirestore();
  const now = Date.now();
  const leaseId = randomUUID();
  const acquired = await db.runTransaction(async (tx) => {
    const [snap, configSnap] = await Promise.all([
      tx.get(ref),
      tx.get(groupRef(groupId)),
    ]);
    if (configSnap.data()?.accountKey !== config.accountKey) return false;
    const prev = snap.data() as AttendanceSession | undefined;
    if ((prev?.leaseUntilMs ?? 0) > now) return false;
    if (sessionMatches(prev, event, config)) {
      if (force && now - (prev?.lastAttemptMs ?? 0) < 10 * MINUTE) return false;
      if (
        !force &&
        ((prev?.retryAfterMs ?? 0) > now ||
          (prev?.status === "ready" && now - event.endAtMs > DAY))
      )
        return false;
    }
    tx.set(
      ref,
      { leaseId, leaseUntilMs: now + 6 * MINUTE, lastAttemptMs: now },
      { merge: true },
    );
    return true;
  });
  if (!acquired) return false;

  const base = {
    accountKey: config.accountKey!,
    meetingId: event.meetingId,
    eventStartMs: event.startAtMs,
    eventEndMs: event.endAtMs,
    lastAttemptMs: now,
  };
  try {
    const instances = await client.instances(
      event.meetingId,
      event.startAtMs - 30 * MINUTE,
      event.endAtMs,
    );
    let selected: typeof instances;
    try {
      selected = selectInstances(instances, event, siblings);
    } catch {
      throw new PendingReport(
        "Одна сессия Zoom подходит нескольким занятиям. Уточните время в календаре.",
      );
    }
    if (!selected.length)
      throw new PendingReport(
        "Завершившаяся сессия Zoom для этого занятия пока не найдена.",
      );
    if (selected.length > 8)
      throw new PendingReport(
        "Слишком много сессий Zoom в интервале занятия. Уточните время в календаре.",
      );
    const reports: ZoomReport[] = [];
    for (const instance of selected) {
      const report = await client.report(instance.uuid);
      if (
        report.uuid !== instance.uuid ||
        !Number.isFinite(Date.parse(report.end_time)) ||
        Date.parse(report.end_time) > now - 5 * MINUTE ||
        !report.participants.length
      ) {
        throw new PendingReport("Zoom ещё готовит полный отчёт занятия.");
      }
      reports.push(report);
    }
    let rows;
    try {
      rows = buildRows(reports, config.accountKey!, event);
    } catch {
      throw new PendingReport("Zoom ещё не подготовил время всех подключений.");
    }
    if (!rows.length)
      throw new PendingReport(
        "В отчёте нет подключений в указанное время занятия. Проверьте календарь.",
      );
    if (rows.length > 2000)
      throw new PendingReport(
        "Отчёт слишком велик для одного занятия. Уточните интервал в календаре.",
      );
    const snapshotId = randomUUID();
    const snapshot = ref.collection("snapshots").doc(snapshotId);
    for (let i = 0; i < rows.length; i += 400) {
      const batch = db.batch();
      for (const row of rows.slice(i, i + 400))
        batch.set(snapshot.collection("participants").doc(row.key), row);
      await batch.commit();
    }
    await db.runTransaction(async (tx) => {
      const [current, settings] = await Promise.all([
        tx.get(ref),
        tx.get(groupRef(groupId)),
      ]);
      if (
        current.data()?.leaseId !== leaseId ||
        settings.data()?.accountKey !== config.accountKey
      )
        return;
      tx.set(snapshot, {
        createdAtMs: now,
        meetingUuids: reports.map((r) => r.uuid),
        rowCount: rows.length,
      });
      tx.set(ref, {
        ...base,
        activeSnapshot: snapshotId,
        status: "ready",
        message: null,
        syncedAtMs: now,
        retryAfterMs: now + 6 * 60 * MINUTE,
        leaseUntilMs: 0,
      });
    });
    return true;
  } catch (error) {
    const retrySeconds =
      error instanceof ZoomApiError ? (error.retryAfterSec ?? 0) : 0;
    await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      const prev = current.data() as AttendanceSession | undefined;
      if (prev?.leaseId !== leaseId) return;
      const keepReady =
        sessionMatches(prev, event, config) && prev?.status === "ready";
      tx.set(
        ref,
        {
          ...base,
          status: keepReady
            ? "ready"
            : error instanceof PendingReport
              ? "pending"
              : "error",
          message: publicMessage(error),
          retryAfterMs:
            now + Math.max(30 * MINUTE, Math.min(retrySeconds, 86400) * 1000),
          leaseUntilMs: 0,
          ...(keepReady ? {} : { activeSnapshot: null, syncedAtMs: null }),
        },
        { merge: true },
      );
    });
    return true;
  }
}
