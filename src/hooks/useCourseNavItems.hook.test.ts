import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  orderBy: vi.fn((field: string, direction?: string) => ({ field, direction })),
  query: vi.fn((collectionRef: unknown) => collectionRef),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
}));

vi.mock('../lib/courseLessons', async () => {
  const actual = await vi.importActual<typeof import('../lib/courseLessons')>('../lib/courseLessons');
  return {
    ...actual,
    getCourseLessonsCollectionRef: vi.fn((courseId: string) => ({ courseId })),
  };
});

import { resetCourseNavItemsCacheForTests, useCourseNavItems } from './useCourseNavItems';

function makeDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

describe('useCourseNavItems', () => {
  const getDocMock = vi.mocked(getDoc);
  const getDocsMock = vi.mocked(getDocs);

  beforeEach(() => {
    getDocMock.mockReset();
    getDocsMock.mockReset();
    resetCourseNavItemsCacheForTests();
    // SWR-кэш шторки живёт в localStorage — чистим между тестами
    window.localStorage.clear();
  });

  it('loads Firestore-only lessons for core courses (fallback без nav-индекса)', async () => {
    getDocMock.mockResolvedValue({ exists: () => false } as never);
    getDocsMock.mockResolvedValue({
      docs: [
        makeDoc('general-1', {
          period: 'general-1',
          title: 'История психологии и методы',
          order: 0,
          published: true,
        }),
        makeDoc('vnimanie-teorii', {
          period: 'vnimanie-teorii',
          title: 'Внимание: теории',
          order: 4,
          published: true,
        }),
      ],
    } as never);

    const { result } = renderHook(() => useCourseNavItems('general'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toContainEqual({
      path: '/general/vnimanie-teorii',
      label: 'Внимание: теории',
    });
  });

  it('использует nav-индекс без чтения полной коллекции (LS-3)', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        v: 1,
        updatedAt: '2026-08-23T00:00:00.000Z',
        items: [{ id: 'lesson-1', title: 'Первое занятие', order: 0 }],
      }),
    } as never);

    const { result } = renderHook(() => useCourseNavItems('my-dynamic-course'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toContainEqual({
      path: '/course/my-dynamic-course/lesson-1',
      label: 'Первое занятие',
    });
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it('зависшее чтение не застревает навсегда: таймаут отдаёт ошибку', async () => {
    vi.useFakeTimers();
    try {
      // И индекс, и fallback-коллекция висят бесконечно
      getDocMock.mockReturnValue(new Promise(() => {}) as never);
      getDocsMock.mockReturnValue(new Promise(() => {}) as never);

      const { result } = renderHook(() => useCourseNavItems('my-dynamic-course'));
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    } finally {
      vi.useRealTimers();
    }
  });

  it('после ошибки повторное открытие пробует загрузку заново (in-flight не залипает)', async () => {
    vi.useFakeTimers();
    try {
      getDocMock.mockReturnValue(new Promise(() => {}) as never);
      getDocsMock.mockReturnValue(new Promise(() => {}) as never);

      const first = renderHook(() => useCourseNavItems('my-dynamic-course'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000);
      });
      expect(first.result.current.error).toBeInstanceOf(Error);
      first.unmount();
      vi.useRealTimers();

      // Второй заход: Firestore ожил
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => ({
          v: 1,
          updatedAt: '2026-08-23T00:00:00.000Z',
          items: [{ id: 'lesson-1', title: 'Первое занятие', order: 0 }],
        }),
      } as never);

      const second = renderHook(() => useCourseNavItems('my-dynamic-course'));
      await waitFor(() => {
        expect(second.result.current.loading).toBe(false);
      });
      expect(second.result.current.items).toContainEqual({
        path: '/course/my-dynamic-course/lesson-1',
        label: 'Первое занятие',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
