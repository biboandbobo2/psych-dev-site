import { describe, expect, it } from 'vitest';
import { buildCourseOptions } from './useCourses';

describe('buildCourseOptions', () => {
  it('applies name/icon overrides for core courses from Firestore docs', () => {
    const courses = buildCourseOptions(
      [
        {
          id: 'development',
          data: { name: 'Психология развития PRO', icon: '🚀' },
        },
      ],
      true
    );

    const development = courses.find((course) => course.id === 'development');
    expect(development?.name).toBe('Психология развития PRO');
    expect(development?.icon).toBe('🚀');
    expect(development?.isCore).toBe(true);
  });

  it('filters unpublished dynamic courses when includeUnpublished=false', () => {
    const courses = buildCourseOptions(
      [
        {
          id: 'custom-course',
          data: { name: 'Кастомный курс', published: false, order: 10 },
        },
      ],
      false
    );

    expect(courses.some((course) => course.id === 'custom-course')).toBe(false);
  });

  it('keeps unpublished dynamic courses when includeUnpublished=true', () => {
    const courses = buildCourseOptions(
      [
        {
          id: 'custom-course',
          data: { name: 'Кастомный курс', published: false, order: 10 },
        },
      ],
      true
    );

    const customCourse = courses.find((course) => course.id === 'custom-course');
    expect(customCourse?.published).toBe(false);
    expect(customCourse?.isCore).toBe(false);
  });
});
