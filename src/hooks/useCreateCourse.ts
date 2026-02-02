import { useState } from 'react';
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugLog, debugError } from '../lib/debug';
import { DEFAULT_THEME } from '../theme/periods';
import { CORE_COURSE_ORDER, isCoreCourse } from '../constants/courses';
import { getCourseLessonDocRef } from '../lib/courseLessons';

interface CreateCourseResult {
  success: boolean;
  error?: string;
}

export function useCreateCourse() {
  const [creating, setCreating] = useState(false);

  async function checkCourseIdExists(courseId: string): Promise<boolean> {
    if (isCoreCourse(courseId)) return true;
    const docRef = doc(db, 'courses', courseId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  async function getNextCourseOrder(): Promise<number> {
    const q = query(collection(db, 'courses'), orderBy('order', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return CORE_COURSE_ORDER.length;
    }
    const maxOrder = snapshot.docs[0].data().order ?? CORE_COURSE_ORDER.length;
    return Math.max(maxOrder, CORE_COURSE_ORDER.length - 1) + 1;
  }

  async function createCourse(
    courseId: string,
    courseName: string,
    firstLessonId: string,
    firstLessonTitle: string
  ): Promise<CreateCourseResult> {
    if (!courseName.trim()) {
      return { success: false, error: 'Название курса обязательно' };
    }

    if (!firstLessonTitle.trim()) {
      return { success: false, error: 'Название первого занятия обязательно' };
    }

    if (!courseId.trim()) {
      return { success: false, error: 'ID курса обязателен' };
    }

    if (!firstLessonId.trim()) {
      return { success: false, error: 'ID первого занятия обязателен' };
    }

    if (!/^[a-z0-9-]+$/.test(courseId)) {
      return { success: false, error: 'ID курса может содержать только латинские буквы, цифры и дефисы' };
    }

    if (!/^[a-z0-9-]+$/.test(firstLessonId)) {
      return { success: false, error: 'ID занятия может содержать только латинские буквы, цифры и дефисы' };
    }

    try {
      setCreating(true);

      const exists = await checkCourseIdExists(courseId);
      if (exists) {
        return { success: false, error: 'Курс с таким ID уже существует' };
      }

      const order = await getNextCourseOrder();
      const courseRef = doc(db, 'courses', courseId);

      await setDoc(courseRef, {
        id: courseId,
        name: courseName.trim(),
        icon: '🎓',
        order,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const lessonRef = getCourseLessonDocRef(courseId, firstLessonId);
      await setDoc(lessonRef, {
        period: firstLessonId,
        courseId,
        title: firstLessonTitle.trim(),
        label: firstLessonTitle.trim(),
        subtitle: '',
        published: true,
        placeholder_enabled: true,
        placeholder_text: 'Контент для этого занятия появится в ближайшем обновлении.',
        order: 0,
        accent: DEFAULT_THEME.accent,
        accent100: DEFAULT_THEME.accent100,
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sections: {},
      });

      debugLog('Course created:', { courseId, courseName, firstLessonId });
      return { success: true };
    } catch (err) {
      debugError('Error creating course:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Не удалось создать курс',
      };
    } finally {
      setCreating(false);
    }
  }

  return { creating, createCourse, checkCourseIdExists };
}
