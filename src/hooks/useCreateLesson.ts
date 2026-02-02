import { useState } from 'react';
import { setDoc, getDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { debugLog, debugError } from '../lib/debug';
import type { CourseType } from '../types/tests';
import { getCourseLessonDocRef, getCourseLessonsCollectionRef } from '../lib/courseLessons';

interface CreateLessonResult {
  success: boolean;
  error?: string;
}

/**
 * Hook для создания нового занятия в Firestore
 */
export function useCreateLesson() {
  const [creating, setCreating] = useState(false);

  /**
   * Проверяет, существует ли занятие с таким ID
   */
  async function checkIdExists(course: CourseType, periodId: string): Promise<boolean> {
    const docRef = getCourseLessonDocRef(course, periodId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  /**
   * Получает следующий порядковый номер для занятия
   */
  async function getNextOrder(course: CourseType): Promise<number> {
    const lessonsRef = getCourseLessonsCollectionRef(course);
    const q = query(lessonsRef, orderBy('order', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0;
    }

    const maxOrder = snapshot.docs[0].data().order ?? 0;
    return maxOrder + 1;
  }

  /**
   * Создаёт новое занятие
   */
  async function createLesson(
    course: CourseType,
    title: string,
    periodId: string
  ): Promise<CreateLessonResult> {
    if (!title.trim()) {
      return { success: false, error: 'Название обязательно' };
    }

    if (!periodId.trim()) {
      return { success: false, error: 'ID обязателен' };
    }

    // Проверяем валидность ID (только латиница, цифры, дефисы)
    if (!/^[a-z0-9-]+$/.test(periodId)) {
      return { success: false, error: 'ID может содержать только латинские буквы, цифры и дефисы' };
    }

    try {
      setCreating(true);

      // Проверяем уникальность ID
      const exists = await checkIdExists(course, periodId);
      if (exists) {
        return { success: false, error: 'Занятие с таким ID уже существует' };
      }

      // Получаем следующий порядковый номер
      const nextOrder = await getNextOrder(course);

      // Создаём документ
      const docRef = getCourseLessonDocRef(course, periodId);

      const data = {
        period: periodId,
        courseId: course,
        title: title.trim(),
        label: title.trim(),
        subtitle: '',
        published: false,
        placeholder_enabled: true,
        placeholder_text: 'Контент для этого занятия появится в ближайшем обновлении.',
        order: nextOrder,
        accent: '#6366f1',     // Indigo по умолчанию
        accent100: '#e0e7ff',
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sections: {},
      };

      await setDoc(docRef, data);

      debugLog('Lesson created:', { course, periodId, title });

      return { success: true };
    } catch (err) {
      debugError('Error creating lesson:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Не удалось создать занятие'
      };
    } finally {
      setCreating(false);
    }
  }

  return { createLesson, checkIdExists, creating };
}
