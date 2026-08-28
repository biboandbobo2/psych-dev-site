import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock useCourseStore before importing the hook
const mockSetCurrentCourse = vi.fn();
let mockCurrentCourse = 'development';

vi.mock('../../stores/useCourseStore', () => ({
  useCourseStore: () => ({
    currentCourse: mockCurrentCourse,
    setCurrentCourse: mockSetCurrentCourse,
  }),
}));

import { useActiveCourse } from '../useActiveCourse';
import type { CourseOption } from '../useCourses';

const makeCourse = (id: string): CourseOption => ({
  id,
  name: id,
  icon: '📚',
  order: 0,
  published: true,
});

describe('useActiveCourse', () => {
  beforeEach(() => {
    mockCurrentCourse = 'development';
    mockSetCurrentCourse.mockClear();
  });

  it('returns currentCourse when it exists in courses list', () => {
    const courses = [makeCourse('development'), makeCourse('clinical')];
    const { result } = renderHook(() => useActiveCourse(courses, false));
    expect(result.current).toBe('development');
  });

  it('returns first available course when currentCourse is not in list', () => {
    mockCurrentCourse = 'nonexistent';
    const courses = [makeCourse('clinical'), makeCourse('general')];
    const { result } = renderHook(() => useActiveCourse(courses, false));
    // Персистентный курс, недоступный текущему пользователю (удалён или вне
    // editableCourses), не должен просачиваться наружу.
    expect(result.current).toBe('clinical');
  });

  it('keeps persisted course while the list is loading', () => {
    mockCurrentCourse = 'my-course';
    const courses = [makeCourse('development')];
    const { result } = renderHook(() => useActiveCourse(courses, true));
    expect(result.current).toBe('my-course');
  });

  it('calls setCurrentCourse when currentCourse is not in courses', () => {
    mockCurrentCourse = 'nonexistent';
    const courses = [makeCourse('clinical'), makeCourse('general')];
    renderHook(() => useActiveCourse(courses, false));
    expect(mockSetCurrentCourse).toHaveBeenCalledWith('clinical');
  });

  it('does not call setCurrentCourse when loading', () => {
    mockCurrentCourse = 'nonexistent';
    const courses = [makeCourse('clinical')];
    renderHook(() => useActiveCourse(courses, true));
    expect(mockSetCurrentCourse).not.toHaveBeenCalled();
  });

  it('does not call setCurrentCourse when courses are empty', () => {
    mockCurrentCourse = 'nonexistent';
    renderHook(() => useActiveCourse([], false));
    expect(mockSetCurrentCourse).not.toHaveBeenCalled();
  });

  it('returns empty string when courses list is empty and loading finished', () => {
    mockCurrentCourse = 'nonexistent';
    const { result } = renderHook(() => useActiveCourse([], false));
    // Админ без курсов в управлении: вызывающий код показывает заглушку.
    expect(result.current).toBe('');
  });
});
