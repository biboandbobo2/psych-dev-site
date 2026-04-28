import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';

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
  const getDocsMock = vi.mocked(getDocs);

  beforeEach(() => {
    getDocsMock.mockReset();
    resetCourseNavItemsCacheForTests();
  });

  it('loads Firestore-only lessons for core courses', async () => {
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
});
