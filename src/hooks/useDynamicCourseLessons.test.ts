import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
  query: vi.fn((collectionRef: unknown) => collectionRef),
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

import { prefetchDynamicCourseLessons, resetDynamicCourseLessonsCacheForTests, useDynamicCourseLessons } from './useDynamicCourseLessons';

function makeSnapshot(
  docs: Array<{
    id: string;
    data: () => Record<string, unknown>;
  }>
) {
  return {
    forEach(callback: (doc: { id: string; data: () => Record<string, unknown> }) => void) {
      docs.forEach((doc) => callback(doc));
    },
  };
}

describe('useDynamicCourseLessons', () => {
  const getDocsMock = vi.mocked(getDocs);

  beforeEach(() => {
    getDocsMock.mockReset();
    resetDynamicCourseLessonsCacheForTests();
  });

  it('фильтрует unpublished lessons для dynamic courses', async () => {
    getDocsMock.mockResolvedValue(
      makeSnapshot([
        {
          id: 'lesson-1',
          data: () => ({ title: 'Опубликованное занятие', order: 1, published: true }),
        },
        {
          id: 'lesson-2',
          data: () => ({ title: 'Черновик', order: 2, published: false }),
        },
      ]) as never
    );

    const { result } = renderHook(() => useDynamicCourseLessons('custom-course', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect([...result.current.topics.keys()]).toEqual(['lesson-1']);
  });

  it('дедуплицирует параллельный prefetch одного dynamic course', async () => {
    getDocsMock.mockResolvedValue(
      makeSnapshot([
        {
          id: 'lesson-1',
          data: () => ({ title: 'Занятие', order: 1, published: true }),
        },
      ]) as never
    );

    await Promise.all([
      prefetchDynamicCourseLessons(['custom-course']),
      prefetchDynamicCourseLessons(['custom-course']),
    ]);

    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });

  it('использует prefetched cache без повторного loading state', async () => {
    getDocsMock.mockResolvedValue(
      makeSnapshot([
        {
          id: 'lesson-1',
          data: () => ({ title: 'Закешированное занятие', order: 1, published: true }),
        },
      ]) as never
    );

    await prefetchDynamicCourseLessons(['custom-course']);
    getDocsMock.mockClear();

    const { result } = renderHook(() => useDynamicCourseLessons('custom-course', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect([...result.current.topics.keys()]).toEqual(['lesson-1']);
    });

    expect(getDocsMock).not.toHaveBeenCalled();
  });
});
