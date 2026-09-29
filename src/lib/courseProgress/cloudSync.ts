import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { debugError } from '../debug';
import { useCourseProgressStore } from '../../stores/useCourseProgressStore';
import type {
  CloudCourseProgress,
  CloudLastLesson,
  CloudVideoResume,
  CloudVideoStat,
} from './types';

/**
 * Гибридная стратегия записи прогресса курса:
 *  - localStorage пишется немедленно (быстро, бесплатно) — в самих
 *    save-функциях (lastCourseLesson, courseVideoResume, courseWatchedLessons).
 *  - В Firestore грязные поля сливаются периодически и при уходе со страницы.
 *    Это резко сокращает count writes на /day по сравнению с записью каждые
 *    5 сек: ~10 записей на 2-часовую лекцию вместо ~240.
 */

const FLUSH_INTERVAL_MS = 120_000;

interface SyncContext {
  uid: string;
  unsubscribe: Unsubscribe;
  intervalId: ReturnType<typeof setInterval> | null;
  pending: Map<string, Partial<CloudCourseProgress>>;
  flushing: boolean;
  /** До первого snapshot read API использует только localStorage. */
  hydrated: boolean;
}

let context: SyncContext | null = null;

function ensurePending(courseId: string): Partial<CloudCourseProgress> {
  if (!context) return {};
  let entry = context.pending.get(courseId);
  if (!entry) {
    entry = {};
    context.pending.set(courseId, entry);
  }
  return entry;
}

async function flushPending(): Promise<void> {
  if (!context) return;
  if (context.flushing) return;
  if (context.pending.size === 0) return;

  const ctx = context;
  ctx.flushing = true;
  const items = Array.from(ctx.pending.entries());
  ctx.pending.clear();

  try {
    await Promise.all(
      items.map(([courseId, patch]) =>
        setDoc(
          doc(db, 'users', ctx.uid, 'courseProgress', courseId),
          { ...patch, updatedAt: serverTimestamp() },
          { merge: true },
        ).catch((err) => {
          debugError('courseProgress: setDoc failed', { courseId, err });
          // Возвращаем patch в pending, чтобы попробовать ещё раз на следующем
          // тике или при следующем визите. videoStats сливаем по занятиям:
          // поверхностный spread потерял бы видео из упавшего patch.
          const existing = ctx.pending.get(courseId) ?? {};
          const merged: Partial<CloudCourseProgress> = { ...patch, ...existing };
          if (patch.videoStats && existing.videoStats) {
            merged.videoStats = { ...patch.videoStats };
            for (const [lessonId, videos] of Object.entries(existing.videoStats)) {
              merged.videoStats[lessonId] = { ...patch.videoStats[lessonId], ...videos };
            }
          }
          ctx.pending.set(courseId, merged);
        }),
      ),
    );
  } finally {
    ctx.flushing = false;
  }
}

function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') {
    void flushPending();
  }
}

function handlePageHide(): void {
  void flushPending();
}

function attachLifecycleListeners(): void {
  if (typeof window === 'undefined') return;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
}

function detachLifecycleListeners(): void {
  if (typeof window === 'undefined') return;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pagehide', handlePageHide);
}

/**
 * Стартует подписку на users/{uid}/courseProgress. Возвращает функцию
 * отписки. Безопасно вызывать повторно с тем же uid — будет no-op.
 */
export function initCourseProgressSync(uid: string): () => void {
  if (!uid) return () => undefined;
  if (context && context.uid === uid) {
    return () => cleanupCourseProgressSync();
  }
  cleanupCourseProgressSync();

  const colRef = collection(db, 'users', uid, 'courseProgress');
  const unsubscribe = onSnapshot(
    colRef,
    (snap) => {
      const next: Record<string, CloudCourseProgress> = {};
      snap.forEach((d) => {
        const data = d.data() as CloudCourseProgress | undefined;
        if (data) next[d.id] = data;
      });
      useCourseProgressStore.getState().setSnapshot(next);
      if (context) context.hydrated = true;
    },
    (err) => {
      debugError('courseProgress: snapshot error', err);
    },
  );

  context = {
    uid,
    unsubscribe,
    intervalId: setInterval(() => {
      void flushPending();
    }, FLUSH_INTERVAL_MS),
    pending: new Map(),
    flushing: false,
    hydrated: false,
  };
  attachLifecycleListeners();

  return () => cleanupCourseProgressSync();
}

export function cleanupCourseProgressSync(): void {
  if (!context) return;
  // Best-effort flush перед отпиской.
  void flushPending();
  context.unsubscribe();
  if (context.intervalId !== null) {
    clearInterval(context.intervalId);
  }
  detachLifecycleListeners();
  context = null;
  useCourseProgressStore.getState().reset();
}

/** Текущий uid синка — нужен для проверки гость/студент в save-функциях. */
export function getSyncedUid(): string | null {
  return context?.uid ?? null;
}

export function scheduleVideoResumeUpload(
  courseId: string,
  payload: CloudVideoResume,
): void {
  if (!context || !courseId) return;
  const entry = ensurePending(courseId);
  entry.videoResume = payload;
}

export function scheduleLastLessonUpload(
  courseId: string,
  payload: CloudLastLesson,
): void {
  if (!context || !courseId) return;
  const entry = ensurePending(courseId);
  entry.lastLesson = payload;
}

export function scheduleWatchedListUpload(
  courseId: string,
  watchedLessonIds: string[],
): void {
  if (!context || !courseId) return;
  const entry = ensurePending(courseId);
  entry.watchedLessonIds = watchedLessonIds;
}

/**
 * Статистика одного видео: в Firestore уходит только это видео — merge:true
 * сливает вложенные map'ы, остальные видео и занятия не затираются.
 */
export function scheduleVideoStatUpload(
  courseId: string,
  lessonId: string,
  videoKey: string,
  stat: CloudVideoStat,
): void {
  if (!context || !courseId) return;
  const entry = ensurePending(courseId);
  const stats = entry.videoStats ?? {};
  stats[lessonId] = { ...stats[lessonId], [videoKey]: stat };
  entry.videoStats = stats;
}

/**
 * Cloud-cache доступ для read-API. Возвращает undefined если snapshot ещё
 * не загружен — caller сделает fallback на localStorage.
 */
export function readCloudProgress(courseId: string): CloudCourseProgress | undefined {
  if (!context?.hydrated) return undefined;
  return useCourseProgressStore.getState().byCourse[courseId];
}

export function readAllCloudProgress(): Record<string, CloudCourseProgress> | null {
  if (!context?.hydrated) return null;
  return useCourseProgressStore.getState().byCourse;
}
