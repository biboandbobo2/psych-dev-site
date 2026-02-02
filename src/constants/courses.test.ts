import { describe, it, expect } from 'vitest';
import {
  CORE_COURSE_LIST,
  CORE_COURSE_ORDER,
  getCourseBasePath,
  getCourseDisplayName,
  getCourseIcon,
  isCoreCourse,
} from './courses';

describe('courses constants', () => {
  it('lists core courses in expected order', () => {
    expect(CORE_COURSE_ORDER).toEqual(['development', 'clinical', 'general']);
    expect(CORE_COURSE_LIST.map((course) => course.id)).toEqual(CORE_COURSE_ORDER);
  });

  it('detects core courses', () => {
    expect(isCoreCourse('development')).toBe(true);
    expect(isCoreCourse('clinical')).toBe(true);
    expect(isCoreCourse('general')).toBe(true);
    expect(isCoreCourse('custom-course')).toBe(false);
  });

  it('builds base paths', () => {
    expect(getCourseBasePath('development')).toBe('/');
    expect(getCourseBasePath('clinical')).toBe('/clinical/');
    expect(getCourseBasePath('general')).toBe('/general/');
    expect(getCourseBasePath('custom-course')).toBe('/course/custom-course/');
  });

  it('returns display names and icons', () => {
    expect(getCourseDisplayName('development')).toBe('Психология развития');
    expect(getCourseDisplayName('custom-course', 'Новый курс')).toBe('Новый курс');
    expect(getCourseDisplayName('custom-course')).toBe('custom-course');
    expect(getCourseIcon('custom-course')).toBe('🎓');
    expect(getCourseIcon('custom-course', '✨')).toBe('✨');
  });
});
