import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLectureSources } from './useLectureSources';

vi.mock('../../../lib/apiAuth', () => ({
  buildAuthorizedHeaders: vi.fn(async () => ({
    Authorization: 'Bearer test-token',
  })),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: {
    loading: boolean;
    user: { uid: string } | null;
  }) => unknown) =>
    selector({
      loading: false,
      user: { uid: 'user-1' },
    }),
}));

describe('useLectureSources', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('загружает список лекций с авторизацией', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        courses: [{ courseId: 'development', lectures: [] }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useLectureSources());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/lectures?action=list',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        signal: expect.any(AbortSignal),
      })
    );
    expect(result.current.courses).toHaveLength(1);
  });
});
