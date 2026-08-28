// PV-1: телеметрия посещений публичных страниц (лендингов).
// Коллекции: `page_visit_daily` (агрегат страница×день, только инкременты)
// и `page_visit_months` (месячный счётчик записей — автостоп + оценка стоимости).
// Принципы (docs/guides/product-telemetry.md):
// - privacy-first: на сервер уходят только инкременты агрегатов, никаких
//   идентификаторов посетителя; «уникальность за день/впервые» считается
//   локальной отметкой в localStorage;
// - fire-and-forget: сбой записи никогда не влияет на UX;
// - запись только в проде;
// - автостоп: при MONTHLY_WRITE_CAP записей за календарный месяц подсчёт
//   молча выключается до 1 числа (админ-сводка показывает плашку).
import { doc, getDoc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { debugError } from './debug';

export interface TrackedPage {
  id: string;
  label: string;
  match: (normalizedPath: string) => boolean;
}

// Добавление новой отслеживаемой страницы = одна строка здесь.
// id попадает в document id (только [a-z0-9-]), label — в админ-сводку.
export const TRACKED_PAGES: TrackedPage[] = [
  {
    id: 'vozrast',
    label: 'Лендинг «Психология развития»',
    match: (p) => p === '/vozrast',
  },
  {
    id: 'retraining-belgrade',
    label: 'Переподготовка — Белград',
    match: (p) => p === '/academy/retraining-psychologist-consultant-belgrade',
  },
  {
    id: 'retraining-tbilisi',
    label: 'Переподготовка — Тбилиси',
    match: (p) => p === '/academy/retraining-psychologist-consultant-tbilisi',
  },
];

// Месячный потолок записей телеметрии (~3.3k/день при равномерном трафике).
// Бесплатная квота Firestore — 20k записей/день на весь проект: потолок
// держит телеметрию на малой её доле даже при всплеске.
export const MONTHLY_WRITE_CAP = 100_000;

export const DAILY_COLLECTION = 'page_visit_daily';
export const MONTHS_COLLECTION = 'page_visit_months';

export type ScrollBucket = 'p0' | 'p25' | 'p50' | 'p75' | 'p100';

const SEEN_KEY_PREFIX = 'pv_seen_';
const CAP_CACHE_PREFIX = 'pv_cap_';
const CLICK_ID_PATTERN = /^[a-z0-9_-]{1,40}$/i;

export function matchTrackedPage(normalizedPath: string): TrackedPage | null {
  return TRACKED_PAGES.find((page) => page.match(normalizedPath)) ?? null;
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthKey(date: Date): string {
  return dateKey(date).slice(0, 7);
}

export function scrollBucketFor(depthPercent: number): ScrollBucket {
  if (depthPercent >= 95) return 'p100';
  if (depthPercent >= 75) return 'p75';
  if (depthPercent >= 50) return 'p50';
  if (depthPercent >= 25) return 'p25';
  return 'p0';
}

function isTelemetryEnabled(): boolean {
  return import.meta.env.PROD === true;
}

function readStorage(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // приватный режим / переполнение — молча продолжаем без отметки
  }
}

// Первый onAuthStateChanged — до него currentUser ещё «не решён» и
// залогиненный посетитель посчитался бы гостем.
let authReadyPromise: Promise<void> | null = null;
function waitAuthReady(): Promise<void> {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      try {
        const unsubscribe = onAuthStateChanged(
          auth,
          () => {
            unsubscribe();
            resolve();
          },
          () => resolve()
        );
      } catch {
        resolve();
      }
    });
  }
  return authReadyPromise;
}

// Автостоп: одно чтение месячного счётчика на сессию (кэш в sessionStorage).
// Ошибка чтения не блокирует подсчёт и не кэшируется — следующая сессия
// проверит снова.
let capCheckPromise: Promise<boolean> | null = null;
function isCapReached(): Promise<boolean> {
  if (!capCheckPromise) {
    capCheckPromise = (async () => {
      const cacheKey = `${CAP_CACHE_PREFIX}${monthKey(new Date())}`;
      const cached = readStorage(globalThis.sessionStorage, cacheKey);
      if (cached === 'reached') return true;
      if (cached === 'ok') return false;
      try {
        const snapshot = await getDoc(doc(db, MONTHS_COLLECTION, monthKey(new Date())));
        const writes = snapshot.exists() ? Number(snapshot.data().writes) : 0;
        const reached = Number.isFinite(writes) && writes >= MONTHLY_WRITE_CAP;
        writeStorage(globalThis.sessionStorage, cacheKey, reached ? 'reached' : 'ok');
        return reached;
      } catch (error) {
        debugError('[pageVisits] cap check failed', error);
        return false;
      }
    })();
  }
  return capCheckPromise;
}

interface DailyIncrements {
  views?: number;
  uniqueGuests?: number;
  uniqueUsers?: number;
  newVisitors?: number;
  hour?: number;
  scrollBucket?: ScrollBucket;
  clickId?: string;
}

// Один батч = ровно 2 записи: инкременты дневного агрегата + месячный
// счётчик записей (по нему работают автостоп и ячейка стоимости в админке).
async function commitIncrements(page: TrackedPage, date: Date, inc: DailyIncrements): Promise<void> {
  if (await isCapReached()) return;
  const day = dateKey(date);
  const dailyPayload: Record<string, unknown> = {
    pageId: page.id,
    date: day,
    updatedAt: serverTimestamp(),
  };
  if (inc.views) dailyPayload.views = increment(inc.views);
  if (inc.uniqueGuests) dailyPayload.uniqueGuests = increment(inc.uniqueGuests);
  if (inc.uniqueUsers) dailyPayload.uniqueUsers = increment(inc.uniqueUsers);
  if (inc.newVisitors) dailyPayload.newVisitors = increment(inc.newVisitors);
  if (inc.hour !== undefined) dailyPayload.hours = { [String(inc.hour)]: increment(1) };
  if (inc.scrollBucket) dailyPayload.scroll = { [inc.scrollBucket]: increment(1) };
  if (inc.clickId) dailyPayload.clicks = { [inc.clickId]: increment(1) };

  const batch = writeBatch(db);
  batch.set(doc(db, DAILY_COLLECTION, `${page.id}__${day}`), dailyPayload, { merge: true });
  batch.set(
    doc(db, MONTHS_COLLECTION, monthKey(date)),
    { writes: increment(2), views: increment(inc.views ?? 0), updatedAt: serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
}

function currentScrollDepthPercent(): number {
  const el = document.scrollingElement ?? document.documentElement;
  if (!el || el.scrollHeight <= 0) return 0;
  return ((el.scrollTop + window.innerHeight) / el.scrollHeight) * 100;
}

/**
 * Запускает трекинг посещения страницы (если путь отслеживается и это прод).
 * Пишет просмотр + уникальность, копит max-глубину скролла (уходит одной
 * записью при сворачивании/уходе со страницы) и клики по [data-track-click].
 * Возвращает cleanup для вызова при уходе с маршрута.
 */
export function startPageVisit(normalizedPath: string): () => void {
  const page = matchTrackedPage(normalizedPath);
  if (!page || !isTelemetryEnabled() || typeof document === 'undefined') {
    return () => {};
  }

  const visitDate = new Date();
  let maxDepth = 0;
  let scrollFlushed = false;
  let viewSent = false;
  const clickedIds = new Set<string>();

  const onScroll = () => {
    maxDepth = Math.max(maxDepth, currentScrollDepthPercent());
  };

  const flushScroll = () => {
    if (scrollFlushed || !viewSent) return;
    scrollFlushed = true;
    void commitIncrements(page, visitDate, { scrollBucket: scrollBucketFor(maxDepth) }).catch(
      (error) => debugError('[pageVisits] scroll flush failed', error)
    );
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flushScroll();
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const clickId = target?.closest('[data-track-click]')?.getAttribute('data-track-click');
    if (!clickId || !CLICK_ID_PATTERN.test(clickId) || clickedIds.has(clickId)) return;
    clickedIds.add(clickId);
    void commitIncrements(page, visitDate, { clickId }).catch((error) =>
      debugError('[pageVisits] click track failed', error)
    );
  };

  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('click', onClick, { capture: true });

  void (async () => {
    try {
      if (await isCapReached()) return;
      await waitAuthReady();
      const today = dateKey(visitDate);
      const seenKey = `${SEEN_KEY_PREFIX}${page.id}`;
      const lastSeenDay = readStorage(globalThis.localStorage, seenKey);
      const isGuest = !auth.currentUser;
      await commitIncrements(page, visitDate, {
        views: 1,
        hour: visitDate.getHours(),
        ...(lastSeenDay !== today
          ? { [isGuest ? 'uniqueGuests' : 'uniqueUsers']: 1 }
          : {}),
        ...(lastSeenDay === null ? { newVisitors: 1 } : {}),
      });
      viewSent = true;
      writeStorage(globalThis.localStorage, seenKey, today);
      onScroll();
    } catch (error) {
      debugError('[pageVisits] view track failed', error);
    }
  })();

  return () => {
    flushScroll();
    document.removeEventListener('scroll', onScroll, { capture: true });
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('click', onClick, { capture: true });
  };
}
