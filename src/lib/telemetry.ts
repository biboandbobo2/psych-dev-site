// PT-1: продуктовая телеметрия — сырые события использования фич в
// коллекции `feature_events`. Принципы (docs/guides/product-telemetry.md):
// агрегаты, не слежка (усечённый SHA-256 от uid, никаких текстов запросов);
// fire-and-forget (сбой записи никогда не влияет на UX); запись только в
// проде (dev-сессии и vitest не мусорят в статистику); гостей не трекаем.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { debugError } from './debug';

export type FeatureEventName =
  | 'study_mode_opened'
  | 'transcript_opened'
  | 'selection_explain'
  | 'selection_search'
  | 'research_search'
  | 'book_rag_question'
  | 'lecture_ai_question'
  | 'test_started'
  | 'test_completed';

export interface FeatureEventMeta {
  courseId?: string;
  periodId?: string;
}

const HASHED_UID_LENGTH = 16;

// Дедуп в рамках сессии (жизни вкладки): повторное событие с теми же
// event+meta не пишется — счётчики отвечают на «фича использована в сессии»,
// а не «сколько раз кликнули».
const sentThisSession = new Set<string>();

function isTelemetryEnabled(): boolean {
  return import.meta.env.PROD === true;
}

async function hashUid(uid: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(uid));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, HASHED_UID_LENGTH);
}

function detectPlatform(): 'mobile' | 'desktop' {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
    }
  } catch {
    // matchMedia недоступен (SSR/старый браузер) — считаем desktop
  }
  return 'desktop';
}

export function trackFeatureEvent(event: FeatureEventName, meta: FeatureEventMeta = {}): void {
  if (!isTelemetryEnabled()) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const dedupKey = `${event}|${meta.courseId ?? ''}|${meta.periodId ?? ''}`;
  if (sentThisSession.has(dedupKey)) return;
  sentThisSession.add(dedupKey);

  void (async () => {
    try {
      await addDoc(collection(db, 'feature_events'), {
        hashedUid: await hashUid(uid),
        event,
        ...(meta.courseId ? { courseId: meta.courseId } : {}),
        ...(meta.periodId ? { periodId: meta.periodId } : {}),
        platform: detectPlatform(),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      // Освобождаем ключ: разовая ошибка сети не должна терять событие до
      // конца сессии
      sentThisSession.delete(dedupKey);
      debugError('[telemetry] trackFeatureEvent failed', error);
    }
  })();
}
