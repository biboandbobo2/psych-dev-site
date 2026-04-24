import { describe, expect, it } from 'vitest';

import { getPageCourseId, normalizeAppPath, shouldShowStudentCourseSidebar } from './courseNavigation';

describe('courseNavigation', () => {
  it('normalizes trailing slash', () => {
    expect(normalizeAppPath('/general/memory/')).toBe('/general/memory');
    expect(normalizeAppPath('/')).toBe('/');
  });

  it('detects page course for static and dynamic lesson routes', () => {
    expect(getPageCourseId('/intro')).toBe('development');
    expect(getPageCourseId('/development/intro')).toBe('development');
    expect(getPageCourseId('/clinical/1')).toBe('clinical');
    expect(getPageCourseId('/general/pamyat')).toBe('general');
    expect(getPageCourseId('/course/cognitive-base/lesson-2')).toBe('cognitive-base');
    expect(getPageCourseId('/my-custom-lesson')).toBe('development');
  });

  it('does not treat service pages as lesson routes', () => {
    expect(getPageCourseId('/home')).toBeNull();
    expect(getPageCourseId('/profile')).toBeNull();
    expect(getPageCourseId('/notes')).toBeNull();
    expect(getPageCourseId('/disorder-table')).toBeNull();
    expect(getPageCourseId('/tests')).toBeNull();
    expect(getPageCourseId('/course/custom')).toBeNull();
  });

  it('shows student course sidebar on profile, notes and lesson pages only', () => {
    expect(shouldShowStudentCourseSidebar('/')).toBe(true);
    expect(shouldShowStudentCourseSidebar('/profile')).toBe(true);
    expect(shouldShowStudentCourseSidebar('/notes')).toBe(true);
    expect(shouldShowStudentCourseSidebar('/home')).toBe(false);
    expect(shouldShowStudentCourseSidebar('/general/pamyat')).toBe(true);
    expect(shouldShowStudentCourseSidebar('/timeline')).toBe(false);
    expect(shouldShowStudentCourseSidebar('/disorder-table')).toBe(false);
    expect(shouldShowStudentCourseSidebar('/research')).toBe(false);
  });
});
