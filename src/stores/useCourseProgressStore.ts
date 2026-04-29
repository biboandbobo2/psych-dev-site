import { create } from 'zustand';
import type { CloudCourseProgress } from '../lib/courseProgress/types';

interface CourseProgressState {
  /** Загружен ли первый snapshot из Firestore (после логина). */
  hydrated: boolean;
  /**
   * Cloud-snapshot прогресса по курсам. Ключ — courseId, значение — документ
   * Firestore. Пустая map для гостей или пока не загружено.
   */
  byCourse: Record<string, CloudCourseProgress>;
  /** Bumps each time byCourse changes — для useMemo-зависимостей. */
  version: number;

  setSnapshot: (next: Record<string, CloudCourseProgress>) => void;
  patchCourse: (courseId: string, patch: Partial<CloudCourseProgress>) => void;
  reset: () => void;
}

export const useCourseProgressStore = create<CourseProgressState>((set) => ({
  hydrated: false,
  byCourse: {},
  version: 0,

  setSnapshot: (next) =>
    set((state) => ({
      hydrated: true,
      byCourse: next,
      version: state.version + 1,
    })),

  patchCourse: (courseId, patch) =>
    set((state) => ({
      byCourse: {
        ...state.byCourse,
        [courseId]: { ...state.byCourse[courseId], ...patch },
      },
      version: state.version + 1,
    })),

  reset: () => set({ hydrated: false, byCourse: {}, version: 0 }),
}));
