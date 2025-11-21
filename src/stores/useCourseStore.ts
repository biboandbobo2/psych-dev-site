import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CourseType } from '../types/tests';

interface CourseState {
  currentCourse: CourseType;
  setCurrentCourse: (course: CourseType) => void;
}

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      (set) => ({
        currentCourse: 'development',
        setCurrentCourse: (course) => set({ currentCourse: course }),
      }),
      {
        name: 'course-storage',
      }
    ),
    { name: 'CourseStore' }
  )
);
