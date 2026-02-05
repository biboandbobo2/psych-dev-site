import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

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

  it('returns currentCourse even when not in list (useEffect corrects on next tick)', () => {
    mockCurrentCourse = 'nonexistent';
    const courses = [makeCourse('clinical'), makeCourse('general')];
    const { result } = renderHook(() => useActiveCourse(courses, false));
    // The computed value falls back to currentCourse (2nd in the ?? chain).
    // useEffect triggers setCurrentCourse to fix it on next render cycle.
    expect(result.current).toBe('nonexistent');
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

  it('returns currentCourse when courses list is empty', () => {
    mockCurrentCourse = 'nonexistent';
    const { result } = renderHook(() => useActiveCourse([], false));
    // With empty courses, ?? chain: undefined ?? 'nonexistent' ?? undefined ?? 'development'
    // 'nonexistent' is truthy so it wins.
    expect(result.current).toBe('nonexistent');
  });
});
