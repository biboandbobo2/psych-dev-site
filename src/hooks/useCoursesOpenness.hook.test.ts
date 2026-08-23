import { renderHook, waitFor } from '@testing-library/react';
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

import { useCoursesOpenness } from './useCoursesOpenness';

describe('useCoursesOpenness', () => {
  const getDocMock = vi.mocked(getDoc);
  const getDocsMock = vi.mocked(getDocs);

  beforeEach(() => {
    getDocMock.mockReset();
    getDocsMock.mockReset();
  });

  it('берёт courseOpen из nav-индекса без чтения коллекций занятий (LS-3)', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        v: 1,
        updatedAt: '2026-08-23T00:00:00.000Z',
        items: [{ id: 'lesson-1', title: 'Занятие', order: 0 }],
        courseOpen: true,
      }),
    } as never);

    const { result } = renderHook(() => useCoursesOpenness(['my-course']));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.openCourseIds.has('my-course')).toBe(true);
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it('индекс без courseOpen (старый док) → fallback на полную коллекцию', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        v: 1,
        updatedAt: '2026-08-23T00:00:00.000Z',
        items: [{ id: 'lesson-1', title: 'Занятие', order: 0 }],
      }),
    } as never);
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: 'lesson-1',
          data: () => ({
            period: 'lesson-1',
            title: 'Занятие',
            published: true,
            video_playlist: [{ url: 'https://x', isPublic: true }],
          }),
        },
      ],
    } as never);

    const { result } = renderHook(() => useCoursesOpenness(['my-course']));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.openCourseIds.has('my-course')).toBe(true);
    expect(getDocsMock).toHaveBeenCalled();
  });
});
