import { getSyncedUid, readCloudProgress, scheduleVideoStatUpload } from './courseProgress/cloudSync';
import type { CloudLessonVideoStats, CloudVideoStat } from './courseProgress/types';
import { addSpan, coveredSeconds, mergeSpans } from './courseProgress/watchSpans';

const STORAGE_KEY = 'course-video-stats-v1';

/** Какую долю длительности надо реально проиграть, чтобы видео считалось просмотренным. */
export const VIDEO_WATCHED_SHARE = 0.6;

/**
 * localStorage разбит по uid: без этого статистика прошлого пользователя
 * этого браузера слилась бы в облако следующего (local и cloud объединяются).
 */
type StatsByUser = Record<string, Record<string, CloudLessonVideoStats>>;

function storageUserKey(): string {
  return getSyncedUid() ?? 'guest';
}

function readStorage(): StatsByUser {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as StatsByUser;
  } catch {
    return {};
  }
}

function writeStorage(data: StatsByUser): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write failures
  }
}

/** Объединение статистик одного видео: флаги — «или», отрезки — объединение. */
export function mergeVideoStats(a?: CloudVideoStat, b?: CloudVideoStat): CloudVideoStat {
  const spans = mergeSpans(a?.spans, b?.spans);
  const duration = Math.max(Number(a?.duration) || 0, Number(b?.duration) || 0);
  return {
    ...(a?.watched === true || b?.watched === true ? { watched: true } : {}),
    ...(a?.openedExternally === true || b?.openedExternally === true
      ? { openedExternally: true }
      : {}),
    ...(spans.length > 0 ? { spans } : {}),
    ...(duration > 0 ? { duration } : {}),
  };
}

export function getVideoStat(courseId: string, lessonId: string, videoKey: string): CloudVideoStat {
  if (!courseId || !lessonId || !videoKey) return {};
  const cloud = readCloudProgress(courseId)?.videoStats?.[lessonId]?.[videoKey];
  const local = readStorage()[storageUserKey()]?.[courseId]?.[lessonId]?.[videoKey];
  return mergeVideoStats(cloud, local);
}

function saveVideoStat(
  courseId: string,
  lessonId: string,
  videoKey: string,
  stat: CloudVideoStat
): void {
  const data = readStorage();
  const userKey = storageUserKey();
  const byCourse = data[userKey] ?? {};
  const lessons = byCourse[courseId] ?? {};
  lessons[lessonId] = { ...lessons[lessonId], [videoKey]: stat };
  byCourse[courseId] = lessons;
  data[userKey] = byCourse;
  writeStorage(data);
  scheduleVideoStatUpload(courseId, lessonId, videoKey, stat);
}

/**
 * Проигранный отрезок видео. Возвращает актуальную статистику; `watched`
 * становится true, когда покрыто ≥ 60% длительности. После этого отрезки
 * больше не пишутся — статус окончательный.
 */
export function recordVideoPlayback(
  courseId: string,
  lessonId: string,
  videoKey: string,
  span: { startSec: number; endSec: number; durationSec: number }
): CloudVideoStat {
  const current = getVideoStat(courseId, lessonId, videoKey);
  if (!courseId || !lessonId || !videoKey || current.watched) return current;

  const duration = span.durationSec > 0 ? span.durationSec : (current.duration ?? 0);
  const endSec = duration > 0 ? Math.min(span.endSec, duration) : span.endSec;
  const spans = addSpan(current.spans, span.startSec, endSec);
  if (spans.join(',') === (current.spans ?? []).join(',') && duration === current.duration) {
    return current;
  }

  const next: CloudVideoStat = {
    ...current,
    spans,
    ...(duration > 0 ? { duration } : {}),
    ...(duration > 0 && coveredSeconds(spans) >= duration * VIDEO_WATCHED_SHARE
      ? { watched: true }
      : {}),
  };
  saveVideoStat(courseId, lessonId, videoKey, next);
  return next;
}

/** Студент открыл видео вне сайта (YouTube или исходная ссылка). */
export function recordVideoOpenedExternally(
  courseId: string,
  lessonId: string,
  videoKey: string
): void {
  if (!courseId || !lessonId || !videoKey) return;
  const current = getVideoStat(courseId, lessonId, videoKey);
  if (current.openedExternally) return;
  saveVideoStat(courseId, lessonId, videoKey, { ...current, openedExternally: true });
}
