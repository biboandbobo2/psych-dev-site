import { useState } from 'react';
import { writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugLog, debugError, debugWarn } from '../lib/debug';
import type { CourseType } from '../types/tests';
import { getCourseLessonDocRef } from '../lib/courseLessons';

interface LessonOrder {
  periodId: string;
  order: number;
}

/**
 * Hook для batch-обновления порядка занятий в Firestore
 */
export function useReorderLessons() {
  const [saving, setSaving] = useState(false);

  /**
   * Обновляет порядок занятий после drag-and-drop
   * @param course - тип курса
   * @param newOrder - массив с новым порядком [{periodId, order}, ...]
   */
  async function reorderLessons(
    course: CourseType,
    newOrder: LessonOrder[]
  ): Promise<{ success: boolean; error?: string }> {
    if (newOrder.length === 0) {
      return { success: true };
    }

    try {
      setSaving(true);

      // Проверяем существование всех документов параллельно
      const existenceChecks = await Promise.all(
        newOrder.map(async ({ periodId }) => {
          const docRef = getCourseLessonDocRef(course, periodId);
          const docSnap = await getDoc(docRef);
          return { periodId, exists: docSnap.exists() };
        })
      );

      // Фильтруем только существующие документы
      const existingPeriods = newOrder.filter(({ periodId }) => {
        const check = existenceChecks.find((c) => c.periodId === periodId);
        if (!check?.exists) {
          debugWarn(`⚠️ Skipping update for non-existent document: ${periodId}`);
        }
        return check?.exists;
      });

      if (existingPeriods.length === 0) {
        debugWarn('⚠️ No existing documents to update');
        return { success: true };
      }

      // Создаём batch только для существующих документов
      const batch = writeBatch(db);
      existingPeriods.forEach(({ periodId, order }) => {
        const docRef = getCourseLessonDocRef(course, periodId);
        batch.update(docRef, { order });
      });

      await batch.commit();

      debugLog('Lessons reordered:', { course, count: existingPeriods.length });
      return { success: true };
    } catch (err) {
      debugError('Error reordering lessons:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Не удалось изменить порядок',
      };
    } finally {
      setSaving(false);
    }
  }

  return { reorderLessons, saving };
}
