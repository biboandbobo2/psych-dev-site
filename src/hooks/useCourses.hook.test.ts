import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  collection: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
}));

vi.mock('../lib/firestorePublicRest', () => ({
  isPublicRestAvailable: vi.fn(() => false),
  restListPublicCollection: vi.fn(),
}));

import { isPublicRestAvailable, restListPublicCollection } from '../lib/firestorePublicRest';
import { useCourses } from './useCourses';

describe('useCourses — LS-4 REST-префетч', () => {
  const getDocsMock = vi.mocked(getDocs);
  const restAvailableMock = vi.mocked(isPublicRestAvailable);
  const restListMock = vi.mocked(restListPublicCollection);

  beforeEach(() => {
    getDocsMock.mockReset();
    restAvailableMock.mockReset();
    restAvailableMock.mockReturnValue(false);
    restListMock.mockReset();
  });

  it('REST отдаёт список раньше SDK: курсы рендерятся, loading=false до ответа SDK', async () => {
    restAvailableMock.mockReturnValue(true);
    restListMock.mockResolvedValue([
      { id: 'rest-course', data: { name: 'Курс из REST', published: true, order: 10 } },
    ]);
    // SDK висит (auth ещё инициализируется)
    getDocsMock.mockReturnValue(new Promise(() => {}) as never);

    const { result } = renderHook(() => useCourses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.courses.some((c) => c.id === 'rest-course')).toBe(true);
  });

  it('SDK ответил первым: поздний REST-результат игнорируется', async () => {
    restAvailableMock.mockReturnValue(true);
    let resolveRest: (v: Array<{ id: string; data: Record<string, unknown> }>) => void = () => {};
    restListMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRest = resolve;
      })
    );
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: 'sdk-course',
          data: () => ({ name: 'Курс из SDK', published: true, order: 10 }),
        },
      ],
    } as never);

    const { result } = renderHook(() => useCourses());
    await waitFor(() => {
      expect(result.current.courses.some((c) => c.id === 'sdk-course')).toBe(true);
    });

    await act(async () => {
      resolveRest([{ id: 'stale-rest-course', data: { name: 'Опоздавший REST', order: 11 } }]);
    });

    expect(result.current.courses.some((c) => c.id === 'stale-rest-course')).toBe(false);
    expect(result.current.courses.some((c) => c.id === 'sdk-course')).toBe(true);
  });

  it('REST недоступен (тестовое окружение / нет fetch): работает только SDK-путь', async () => {
    getDocsMock.mockResolvedValue({ docs: [] } as never);

    const { result } = renderHook(() => useCourses());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(restListMock).not.toHaveBeenCalled();
    // core-курсы всегда в списке
    expect(result.current.courses.some((c) => c.id === 'development')).toBe(true);
  });

  it('REST упал: SDK-путь не затронут', async () => {
    restAvailableMock.mockReturnValue(true);
    restListMock.mockRejectedValue(new Error('network'));
    getDocsMock.mockResolvedValue({
      docs: [{ id: 'sdk-course', data: () => ({ name: 'SDK', published: true, order: 1 }) }],
    } as never);

    const { result } = renderHook(() => useCourses());
    await waitFor(() => {
      expect(result.current.courses.some((c) => c.id === 'sdk-course')).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });
});
