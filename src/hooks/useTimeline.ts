import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import type { NodeT, TimelineDocument } from '../pages/timeline/types';
import {
  buildTimelineDocument,
  createTimelineCanvas,
  DEFAULT_TIMELINE_NAME,
  normalizeTimelineDocument,
} from '../pages/timeline/persistence';
import { debugError, debugLog } from '../lib/debug';

/**
 * Хук для работы с таймлайном пользователя
 */
export function useTimeline() {
  const { user } = useAuth();

  /**
   * Добавить событие на таймлайн
   */
  const addEventToTimeline = async (event: Omit<NodeT, 'id'>): Promise<string> => {
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    debugLog('🔵 useTimeline: Adding event to timeline...', event);

    const docRef = doc(db, 'timelines', user.uid);

    try {
      const snap = await getDoc(docRef);
      const normalized = snap.exists()
        ? normalizeTimelineDocument(snap.data() as TimelineDocument)
        : (() => {
            const initialCanvas = createTimelineCanvas(DEFAULT_TIMELINE_NAME);
            return {
              activeCanvasId: initialCanvas.id,
              canvases: [initialCanvas],
            };
          })();

      // Создаём новое событие с ID
      const newEvent: NodeT = {
        ...event,
        id: crypto.randomUUID(),
      };

      const updatedCanvases = normalized.canvases.map((canvas) =>
        canvas.id === normalized.activeCanvasId
          ? {
              ...canvas,
              data: {
                ...canvas.data,
                nodes: [...canvas.data.nodes, newEvent],
              },
            }
          : canvas
      );

      await setDoc(
        docRef,
        {
          ...buildTimelineDocument(user.uid, normalized.activeCanvasId, updatedCanvases),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      debugLog('✅ useTimeline: Event added successfully!', newEvent.id);
      return newEvent.id;
    } catch (error) {
      debugError('❌ useTimeline: Error adding event:', error);
      throw error;
    }
  };

  return {
    addEventToTimeline,
  };
}
