import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import type { NodeT, EdgeT, TimelineData } from '../pages/timeline/types';
import { removeUndefined } from '../utils/removeUndefined';
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
      // Загружаем текущий таймлайн
      const snap = await getDoc(docRef);

      let currentNodes: NodeT[] = [];
      let currentEdges: EdgeT[] = [];
      let currentAge = 35; // По умолчанию
      let ageMax = 100;
      let birthDetails = {};
      let selectedPeriodization = null;

      if (snap.exists()) {
        const data = snap.data()?.data as TimelineData | undefined;
        if (data) {
          currentNodes = data.nodes || [];
          currentEdges = data.edges || [];
          currentAge = data.currentAge || 35;
          ageMax = data.ageMax || 100;
          birthDetails = data.birthDetails || {};
          selectedPeriodization = data.selectedPeriodization || null;
        }
      }

      // Создаём новое событие с ID
      const newEvent: NodeT = {
        ...event,
        id: crypto.randomUUID(),
      };

      // Добавляем событие
      const updatedNodes = [...currentNodes, newEvent];

      // Сохраняем обновлённый таймлайн
      const cleanedData = removeUndefined({
        currentAge,
        ageMax,
        nodes: updatedNodes,
        edges: currentEdges,
        birthDetails,
        selectedPeriodization,
      });

      await setDoc(
        docRef,
        {
          userId: user.uid,
          updatedAt: serverTimestamp(),
          data: cleanedData,
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
