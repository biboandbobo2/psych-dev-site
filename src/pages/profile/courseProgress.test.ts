import { describe, expect, it } from 'vitest';
import { calculateCourseProgress, resolveCurrentLessonIndex } from './courseProgress';

describe('courseProgress', () => {
  const lessons = [
    { period: 'intro', label: 'Введение' },
    { period: 'theme-1', label: 'Тема 1' },
    { period: 'theme-2', label: 'Тема 2' },
  ];

  it('resolves lesson index by saved label', () => {
    const index = resolveCurrentLessonIndex({
      courseId: 'development',
      lessons,
      lastLabel: 'Тема 1',
    });

    expect(index).toBe(1);
  });

  it('resolves lesson index for core courses by saved path', () => {
    const index = resolveCurrentLessonIndex({
      courseId: 'development',
      lessons,
      lastPath: '/intro',
    });

    expect(index).toBe(0);
  });

  it('resolves lesson index for dynamic courses by saved path', () => {
    const index = resolveCurrentLessonIndex({
      courseId: 'new-course',
      lessons,
      lastPath: '/course/new-course/theme-1',
    });

    expect(index).toBe(1);
  });

  it('returns zero progress when no saved lesson', () => {
    const result = calculateCourseProgress({
      courseId: 'development',
      lessons,
    });

    expect(result).toEqual({ percent: 0, completed: 0, total: 3 });
  });

  it('calculates rounded percent from current lesson index', () => {
    const result = calculateCourseProgress({
      courseId: 'development',
      lessons,
      lastLabel: 'Тема 1',
    });

    expect(result).toEqual({ percent: 67, completed: 2, total: 3 });
  });
});
