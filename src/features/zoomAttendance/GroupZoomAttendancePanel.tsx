import { useEffect, useState } from "react";
import type {
  ZoomAttendanceParticipant,
  ZoomAttendanceResponse,
} from "../../../shared/zoomAttendance";
import {
  getAttendance,
  matchParticipant,
  setConnection,
  syncAttendance,
} from "./api";

const control =
  "min-w-0 max-w-full rounded-md border border-[#DDE5EE] bg-white px-2 py-1.5 text-sm";
const button =
  "rounded-md bg-[#2F6DB5] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50";

const safeMessages: Record<string, readonly string[]> = {
  "functions/failed-precondition": [
    "Сначала подключите Zoom к группе.",
    "Zoom-аккаунт не настроен на сервере.",
    "Дождитесь 30 минут после окончания занятия.",
    "Сначала получите отчёт этого занятия.",
  ],
  "functions/resource-exhausted": [
    "Обновление уже выполняется или запускалось менее 10 минут назад.",
  ],
};

function actionError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    safeMessages[error.code]?.includes(error.message)
  )
    return error.message;
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

function ParticipantRow({
  participant,
  students,
  onSave,
  busy,
}: {
  participant: ZoomAttendanceParticipant;
  students: ZoomAttendanceResponse["students"];
  onSave: (studentId: string | null, remember: boolean) => void;
  busy: boolean;
}) {
  const [studentId, setStudentId] = useState(participant.studentId ?? "");
  const [remember, setRemember] = useState(false);
  useEffect(() => {
    setStudentId(participant.studentId ?? "");
    setRemember(false);
  }, [participant.studentId, participant.key]);
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#E8EDF3] py-3 text-sm">
      <div className="w-full min-w-0 break-words sm:w-auto sm:flex-1">
        <span className="font-medium">{participant.name || "Без имени"}</span>
        {participant.email && (
          <span className="block text-xs text-[#556476]">
            {participant.email}
          </span>
        )}
        <span className="block text-xs text-[#556476]">
          {participant.minutes} мин.
        </span>
      </div>
      <label className="sr-only" htmlFor={`participant-${participant.key}`}>
        Студент для {participant.name}
      </label>
      <select
        id={`participant-${participant.key}`}
        className={`${control} w-full sm:w-auto`}
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      >
        <option value="">Не привязан</option>
        {students.map((student) => (
          <option key={student.uid} value={student.uid}>
            {student.displayName || student.email}
          </option>
        ))}
      </select>
      {participant.canRemember ? (
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={!studentId}
          />{" "}
          Запомнить
        </label>
      ) : (
        <span className="text-xs text-[#556476]">
          Привязка только для этого занятия
        </span>
      )}
      <button
        type="button"
        className={button}
        disabled={busy}
        onClick={() =>
          onSave(studentId || null, Boolean(studentId && remember))
        }
      >
        Сохранить
      </button>
    </div>
  );
}

export function GroupZoomAttendancePanel({ groupId }: { groupId: string }) {
  const [eventId, setEventId] = useState("");
  const [data, setData] = useState<{
    key: string;
    value: ZoomAttendanceResponse;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [accountKey, setAccountKey] = useState("");
  const [minPercent, setMinPercent] = useState("");
  const key = `${groupId}:${eventId}`;
  const current = data?.key === key ? data.value : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAttendance({ groupId, ...(eventId ? { eventId } : {}) })
      .then((value) => {
        if (!active) return;
        setData({ key, value });
        setAccountKey(value.settings.accountKey ?? "");
        setMinPercent(String(value.settings.minPercent));
      })
      .catch(() => {
        if (active) {
          setData(null);
          setError("Не удалось загрузить посещаемость. Попробуйте ещё раз.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [groupId, eventId, revision, key]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setRevision((n) => n + 1);
    } catch (caught) {
      setError(actionError(caught));
    } finally {
      setBusy(false);
    }
  };
  const selected = current?.events.find((event) => event.id === eventId);
  return (
    <section
      className="rounded-2xl border border-[#DDE5EE] bg-white p-4 sm:p-5"
      aria-label="Посещаемость Zoom"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-[#2C3E50]">
          Посещаемость Zoom
        </h2>
        <button
          type="button"
          className={control}
          disabled={loading || busy}
          onClick={() => setRevision((n) => n + 1)}
        >
          Обновить
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {(loading || !current) && !error && (
        <p className="mt-2 text-sm text-[#556476]">Загрузка посещаемости…</p>
      )}
      {current && (
        <div className="mt-3 space-y-4">
          {current.canConfigure && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-[#F9FBFF] p-3">
              <label className="grid min-w-0 max-w-full gap-1 text-sm">
                Аккаунт Zoom
                <select
                  className={control}
                  value={accountKey}
                  disabled={
                    (!current.accountsConfigured &&
                      !current.settings.accountKey) ||
                    busy
                  }
                  onChange={(e) => setAccountKey(e.target.value)}
                >
                  <option value="">Отключено</option>
                  {current.settings.accountKey &&
                    !current.accounts.some(
                      (account) => account.key === current.settings.accountKey,
                    ) && (
                      <option value={current.settings.accountKey} disabled>
                        Подключённый аккаунт недоступен
                      </option>
                    )}
                  {current.accounts.map((account) => (
                    <option value={account.key} key={account.key}>
                      {account.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 max-w-full gap-1 text-sm">
                Минимум для зачёта, %
                <input
                  className={`${control} w-24`}
                  type="number"
                  min="1"
                  max="100"
                  value={minPercent}
                  disabled={!current.accountsConfigured || busy}
                  onChange={(e) => setMinPercent(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={button}
                disabled={
                  (!current.accountsConfigured &&
                    !(current.settings.accountKey && !accountKey)) ||
                  busy ||
                  !Number.isInteger(Number(minPercent)) ||
                  Number(minPercent) < 1 ||
                  Number(minPercent) > 100
                }
                onClick={() =>
                  void run(() =>
                    setConnection({
                      groupId,
                      accountKey: accountKey || null,
                      minPercent: Number(minPercent),
                    }),
                  )
                }
              >
                Сохранить настройки
              </button>
              {!current.accountsConfigured && (
                <p className="w-full text-sm text-[#556476]">
                  Аккаунты Zoom ещё не настроены.
                </p>
              )}
            </div>
          )}
          {!current.settings.accountKey ? (
            <p className="text-sm text-[#556476]">
              Учёт посещаемости отключён.
            </p>
          ) : (
            <>
              <label className="grid min-w-0 max-w-full gap-1 text-sm">
                Завершившееся занятие
                <select
                  className={control}
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">Выберите занятие</option>
                  {current.events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {new Date(event.startAtMs).toLocaleString("ru-RU")} —{" "}
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
              {current.events.length === 0 && (
                <p className="text-sm text-[#556476]">
                  Завершившихся занятий Zoom пока нет.
                </p>
              )}
              {selected && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      {selected.status === "ready"
                        ? "Отчёт готов"
                        : selected.status === "pending"
                          ? "Отчёт ещё не готов"
                          : "Ошибка отчёта"}
                    </span>
                    <button
                      type="button"
                      className={button}
                      disabled={busy || loading}
                      onClick={() =>
                        void run(() => syncAttendance({ groupId, eventId }))
                      }
                    >
                      Синхронизировать
                    </button>
                  </div>
                  {selected.message && (
                    <p className="text-sm text-[#556476]">{selected.message}</p>
                  )}
                  {selected.status === "ready" && (
                    <>
                      <div>
                        <h3 className="font-semibold text-[#2C3E50]">
                          Студенты
                        </h3>
                        {current.students.map((student) => {
                          const attendance = current.attendance.find(
                            (row) => row.uid === student.uid,
                          );
                          return (
                            <div
                              key={student.uid}
                              className="flex flex-wrap justify-between gap-2 border-t border-[#E8EDF3] py-2 text-sm"
                            >
                              <span>
                                {student.displayName || student.email}
                              </span>
                              <span>
                                {attendance
                                  ? `${attendance.minutes} мин. · ${attendance.percent}% · ${attendance.present ? "Зачтено" : "Не зачтено"}`
                                  : "Нет данных"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2C3E50]">
                          Участники Zoom
                        </h3>
                        {current.participants.length === 0 && (
                          <p className="text-sm text-[#556476]">
                            Участников в отчёте нет.
                          </p>
                        )}
                        {current.participants.map((participant) => (
                          <ParticipantRow
                            key={participant.key}
                            participant={participant}
                            students={current.students}
                            busy={busy}
                            onSave={(studentId, remember) =>
                              void run(() =>
                                matchParticipant({
                                  groupId,
                                  eventId,
                                  participantKey: participant.key,
                                  studentId,
                                  remember,
                                }),
                              )
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
