import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRole } from '../types/user';
import type { CourseOption } from './useCourses';

const authState: { userRole: UserRole | null; adminEditableCourses: string[] } = {
  userRole: null,
  adminEditableCourses: [],
};

const useCoursesMock = vi.fn();

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('./useCourses', () => ({
  useCourses: (options?: unknown) => useCoursesMock(options),
}));

import { filterEditableCourses, useEditableCourses } from './useEditableCourses';

const course = (id: string, name = id): CourseOption => ({
  id,
  name,
  icon: '🎓',
  order: 0,
  published: true,
  isCore: false,
});

const ALL: CourseOption[] = [course('development'), course('clinical'), course('external-x')];

describe('filterEditableCourses', () => {
  it('super-admin видит все курсы', () => {
    expect(filterEditableCourses(ALL, 'super-admin', []).map((c) => c.id)).toEqual([
      'development',
      'clinical',
      'external-x',
    ]);
  });

  it('admin видит только свои курсы', () => {
    expect(filterEditableCourses(ALL, 'admin', ['external-x']).map((c) => c.id)).toEqual([
      'external-x',
    ]);
  });

  it('admin с пустыми правами не видит ничего', () => {
    expect(filterEditableCourses(ALL, 'admin', [])).toEqual([]);
  });

  it('не-админ не видит ничего', () => {
    expect(filterEditableCourses(ALL, null, ['external-x'])).toEqual([]);
  });
});

describe('useEditableCourses', () => {
  beforeEach(() => {
    useCoursesMock.mockReset();
    useCoursesMock.mockReturnValue({
      courses: ALL,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    authState.userRole = null;
    authState.adminEditableCourses = [];
  });

  it('запрашивает неопубликованные курсы у useCourses', () => {
    authState.userRole = 'super-admin';
    renderHook(() => useEditableCourses());
    expect(useCoursesMock).toHaveBeenCalledWith({ includeUnpublished: true });
  });

  it('фильтрует список и courseMap по правам админа', () => {
    authState.userRole = 'admin';
    authState.adminEditableCourses = ['external-x'];

    const { result } = renderHook(() => useEditableCourses());

    expect(result.current.courses.map((c) => c.id)).toEqual(['external-x']);
    expect(result.current.courseMap.has('external-x')).toBe(true);
    expect(result.current.courseMap.has('development')).toBe(false);
  });

  it('super-admin получает полный список', () => {
    authState.userRole = 'super-admin';

    const { result } = renderHook(() => useEditableCourses());

    expect(result.current.courses).toHaveLength(3);
    expect(result.current.courseMap.size).toBe(3);
  });

  it('пробрасывает loading/error/reload из useCourses', () => {
    const reload = vi.fn();
    const error = new Error('boom');
    useCoursesMock.mockReturnValue({ courses: [], loading: true, error, reload });

    const { result } = renderHook(() => useEditableCourses());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(error);
    expect(result.current.reload).toBe(reload);
  });
});
