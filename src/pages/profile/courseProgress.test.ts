import { describe, expect, it } from 'vitest';
import { calculateCourseProgress } from './courseProgress';

describe('courseProgress', () => {
  it('returns zero progress for empty lessons', () => {
    const result = calculateCourseProgress({
      lessons: [],
      watchedLessonIds: new Set(),
    });

    expect(result).toEqual({ percent: 0, completed: 0, total: 0 });
  });

  it('calculates progress only from watched lessons', () => {
    const result = calculateCourseProgress({
      lessons: [{ period: 'intro' }, { period: 'theme-1' }, { period: 'theme-2' }],
      watchedLessonIds: new Set(['intro', 'theme-2']),
    });

    expect(result).toEqual({ percent: 67, completed: 2, total: 3 });
  });

  it('ignores watched lesson ids that are not in lesson list', () => {
    const result = calculateCourseProgress({
      lessons: [{ period: 'intro' }, { period: 'theme-1' }],
      watchedLessonIds: new Set(['intro', 'unknown']),
    });

    expect(result).toEqual({ percent: 50, completed: 1, total: 2 });
  });
});
