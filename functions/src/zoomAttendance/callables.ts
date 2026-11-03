import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  MyZoomAttendanceResponse,
  ZoomAttendanceResponse,
} from "../../../shared/zoomAttendance/types.js";
import {
  CALLABLE_OPTS,
  FUNCTIONS_SERVICE_ACCOUNT,
  SUPER_ADMIN_EMAIL,
  ensureSuperAdmin,
  isSuperAdmin,
} from "../lib/shared.js";
import { documentId, requireGroup } from "./access.js";
import { loadAccounts } from "./accounts.js";
import { ZoomClient } from "./client.js";
import type { AttendanceSession } from "./model.js";
import {
  loadEvents,
  loadRows,
  loadStudents,
  readConfig,
  resolveStoredAttendance,
  sessionMatches,
  sessionRef,
  groupRef,
} from "./store.js";
import { syncEvent } from "./sync.js";
import { MINUTE } from "./logic.js";

const OPTIONS = {
  ...CALLABLE_OPTS,
  serviceAccount: FUNCTIONS_SERVICE_ACCOUNT,
  timeoutSeconds: 300,
} as const;

/** Never serialize library/network error objects to the callable response. */
function safe<T>(handler: (request: CallableRequest) => Promise<T>) {
  return async (request: CallableRequest): Promise<T> => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "Не удалось обработать посещаемость. Повторите попытку позже.",
      );
    }
  };
}

export const getZoomAttendance = onCall(
  OPTIONS,
  safe(async (request): Promise<ZoomAttendanceResponse> => {
    const groupId = documentId(request.data?.groupId, "groupId");
    const group = await requireGroup(request, groupId);
    const config = await readConfig(groupId);
    const canConfigure = request.auth?.token.email === SUPER_ADMIN_EMAIL;
    const accounts = canConfigure ? await loadAccounts().catch(() => []) : [];
    const events = await loadEvents(groupId);
    const refs = events.map((e) => sessionRef(groupId, e.id));
    const sessions = refs.length ? await getFirestore().getAll(...refs) : [];
    const sessionById = new Map(
      sessions.map((s) => [s.id, s.data() as AttendanceSession | undefined]),
    );
    const students = await loadStudents(group);
    const response: ZoomAttendanceResponse = {
      settings: {
        accountKey: config.accountKey,
        minPercent: config.minPercent,
      },
      canConfigure,
      accounts: accounts.map(({ key, label }) => ({ key, label })),
      accountsConfigured: canConfigure
        ? accounts.length > 0
        : !!config.accountKey,
      events: events.map((event) => {
        const session = sessionById.get(event.id);
        const matches = sessionMatches(session, event, config);
        return {
          id: event.id,
          title: event.title,
          startAtMs: event.startAtMs,
          endAtMs: event.endAtMs,
          status: matches ? session!.status : "pending",
          message: matches ? session!.message : null,
          syncedAtMs: matches ? session!.syncedAtMs : null,
        };
      }),
      students,
      participants: [],
      attendance: [],
    };
    if (request.data?.eventId !== undefined) {
      const eventId = documentId(request.data.eventId, "eventId");
      const event = events.find((e) => e.id === eventId);
      if (!event)
        throw new HttpsError(
          "not-found",
          "Завершившееся занятие за последние 30 дней не найдено.",
        );
      const session = sessionById.get(eventId);
      if (
        sessionMatches(session, event, config) &&
        session?.status === "ready"
      ) {
        Object.assign(
          response,
          await resolveStoredAttendance(
            groupId,
            event,
            session,
            students,
            config.minPercent,
          ),
        );
      }
    }
    return response;
  }),
);

export const setZoomAttendanceConnection = onCall(
  OPTIONS,
  safe(async (request) => {
    ensureSuperAdmin(request);
    const groupId = documentId(request.data?.groupId, "groupId");
    await requireGroup(request, groupId);
    const accountKey: unknown = request.data?.accountKey;
    const minPercent: unknown = request.data?.minPercent;
    if (
      typeof minPercent !== "number" ||
      !Number.isInteger(minPercent) ||
      minPercent < 1 ||
      minPercent > 100
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Порог посещения должен быть целым числом от 1 до 100.",
      );
    }
    if (accountKey !== null) {
      if (
        typeof accountKey !== "string" ||
        !(await loadAccounts()).some((a) => a.key === accountKey)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Выберите настроенный Zoom-аккаунт.",
        );
      }
    }
    await groupRef(groupId).set(
      { accountKey, minPercent, updatedAtMs: Date.now() },
      { merge: true },
    );
    return { success: true };
  }),
);

export const syncZoomAttendance = onCall(
  OPTIONS,
  safe(async (request) => {
    const groupId = documentId(request.data?.groupId, "groupId");
    const eventId = documentId(request.data?.eventId, "eventId");
    await requireGroup(request, groupId);
    const config = await readConfig(groupId);
    if (!config.accountKey)
      throw new HttpsError(
        "failed-precondition",
        "Сначала подключите Zoom к группе.",
      );
    const account = (await loadAccounts()).find(
      (a) => a.key === config.accountKey,
    );
    if (!account)
      throw new HttpsError(
        "failed-precondition",
        "Zoom-аккаунт не настроен на сервере.",
      );
    const events = await loadEvents(groupId);
    const event = events.find((e) => e.id === eventId);
    if (!event)
      throw new HttpsError(
        "not-found",
        "Завершившееся занятие за последние 30 дней не найдено.",
      );
    if (event.endAtMs > Date.now() - 30 * MINUTE) {
      throw new HttpsError(
        "failed-precondition",
        "Дождитесь 30 минут после окончания занятия.",
      );
    }
    const synced = await syncEvent(
      groupId,
      event,
      events,
      config,
      new ZoomClient(account),
      true,
    );
    if (!synced)
      throw new HttpsError(
        "resource-exhausted",
        "Обновление уже выполняется или запускалось менее 10 минут назад.",
      );
    return { success: true };
  }),
);

export const matchZoomAttendanceParticipant = onCall(
  OPTIONS,
  safe(async (request) => {
    const groupId = documentId(request.data?.groupId, "groupId");
    const eventId = documentId(request.data?.eventId, "eventId");
    const key = documentId(request.data?.participantKey, "participantKey");
    const group = await requireGroup(request, groupId);
    const studentId: unknown = request.data?.studentId;
    if (
      studentId !== null &&
      (typeof studentId !== "string" || !group.memberIds?.includes(studentId))
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Выберите участника этой группы.",
      );
    }
    if (typeof request.data?.remember !== "boolean")
      throw new HttpsError(
        "invalid-argument",
        "Укажите, сохранять ли привязку.",
      );
    const config = await readConfig(groupId);
    const event = (await loadEvents(groupId)).find((e) => e.id === eventId);
    const ref = sessionRef(groupId, eventId);
    const session = (await ref.get()).data() as AttendanceSession | undefined;
    if (
      !event ||
      !sessionMatches(session, event, config) ||
      session?.status !== "ready"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Сначала получите отчёт этого занятия.",
      );
    }
    const row = (await loadRows(groupId, eventId, session)).find(
      (r) => r.key === key,
    );
    if (!row) throw new HttpsError("not-found", "Участник не найден в отчёте.");
    if (request.data.remember && !row.aliasKey) {
      throw new HttpsError(
        "invalid-argument",
        "Для гостя без email и Zoom-профиля возможна привязка только к этому занятию.",
      );
    }
    await getFirestore().runTransaction(async (tx) => {
      const [current, settings, currentGroup] = await Promise.all([
        tx.get(ref),
        tx.get(groupRef(groupId)),
        tx.get(getFirestore().collection("groups").doc(groupId)),
      ]);
      const data = currentGroup.data();
      if (
        !data ||
        (!isSuperAdmin(request) &&
          !data.announcementAdminIds?.includes(request.auth!.uid))
      ) {
        throw new HttpsError("permission-denied", "Нет доступа к этой группе.");
      }
      if (studentId !== null && !data.memberIds?.includes(studentId)) {
        throw new HttpsError(
          "invalid-argument",
          "Студент больше не состоит в группе.",
        );
      }
      if (
        current.data()?.activeSnapshot !== session.activeSnapshot ||
        settings.data()?.accountKey !== config.accountKey
      ) {
        throw new HttpsError(
          "aborted",
          "Отчёт обновился. Загрузите его заново.",
        );
      }
      const payload = {
        studentId,
        updatedAtMs: Date.now(),
        updatedBy: request.auth!.uid,
      };
      tx.set(ref.collection("overrides").doc(key), payload);
      if (request.data.remember && row.aliasKey)
        tx.set(
          groupRef(groupId).collection("aliases").doc(row.aliasKey),
          payload,
        );
    });
    return { success: true };
  }),
);

export const getMyZoomAttendance = onCall(
  OPTIONS,
  safe(async (request): Promise<MyZoomAttendanceResponse> => {
    const groupId = documentId(request.data?.groupId, "groupId");
    const eventId = documentId(request.data?.eventId, "eventId");
    const group = await requireGroup(request, groupId, true);
    const config = await readConfig(groupId);
    const empty: MyZoomAttendanceResponse = {
      enabled: !!config.accountKey,
      status: "pending",
      minutes: null,
      percent: null,
      present: null,
    };
    if (!config.accountKey) return empty;
    const event = (await loadEvents(groupId)).find((e) => e.id === eventId);
    if (!event) return empty;
    const session = (await sessionRef(groupId, eventId).get()).data() as
      | AttendanceSession
      | undefined;
    if (!sessionMatches(session, event, config)) return empty;
    if (session?.status !== "ready")
      return { ...empty, status: session?.status ?? "pending" };
    const students = await loadStudents(group);
    const { attendance } = await resolveStoredAttendance(
      groupId,
      event,
      session,
      students,
      config.minPercent,
    );
    const own = attendance.find((a) => a.uid === request.auth!.uid);
    return own
      ? {
          enabled: true,
          status: "ready",
          minutes: own.minutes,
          percent: own.percent,
          present: own.present,
        }
      : empty;
  }),
);
