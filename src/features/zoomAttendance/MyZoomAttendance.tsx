import { useEffect, useState } from "react";
import type { MyZoomAttendanceResponse } from "../../../shared/zoomAttendance";
import { getMyAttendance } from "./api";

export function MyZoomAttendance({
  groupId,
  eventId,
}: {
  groupId: string;
  eventId: string;
}) {
  const key = `${groupId}:${eventId}`;
  const [result, setResult] = useState<{
    key: string;
    value: MyZoomAttendanceResponse;
  } | null>(null);
  const [errorKey, setErrorKey] = useState("");
  useEffect(() => {
    let active = true;
    getMyAttendance({ groupId, eventId })
      .then((value) => {
        if (active) {
          setErrorKey("");
          setResult({ key, value });
        }
      })
      .catch(() => {
        if (active) setErrorKey(key);
      });
    return () => {
      active = false;
    };
  }, [groupId, eventId, key]);
  if (errorKey === key)
    return (
      <p className="mt-3 text-sm text-muted">
        Не удалось загрузить посещаемость.
      </p>
    );
  if (result?.key !== key)
    return <p className="mt-3 text-sm text-muted">Загрузка посещаемости…</p>;
  const { value } = result;
  if (!value.enabled) return null;
  if (value.status === "pending")
    return <p className="mt-3 text-sm text-muted">Отчёт ещё не готов</p>;
  if (value.status === "error")
    return (
      <p className="mt-3 text-sm text-muted">
        Отчёт о посещаемости недоступен.
      </p>
    );
  return (
    <p className="mt-3 text-sm text-fg">
      Посещаемость: {value.minutes ?? 0} мин. · {value.percent ?? 0}% ·{" "}
      {value.present ? "Зачтено" : "Не зачтено"}
    </p>
  );
}
