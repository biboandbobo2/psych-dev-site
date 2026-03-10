import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLectureAnswer } from './useLectureAnswer';

describe('useLectureAnswer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ошибается без выбранного курса', async () => {
    const { result } = renderHook(() => useLectureAnswer());

    act(() => {
      result.current.setQuery('что такое внимание');
    });

    await act(async () => {
      await result.current.askQuestion();
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toContain('Выберите курс');
  });

  it('отправляет запрос на /api/lectures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        answer: 'Ответ по лекциям',
        citations: [],
        tookMs: 120,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useLectureAnswer());

    act(() => {
      result.current.setSelectedCourseId('general');
      result.current.setQuery('что такое внимание');
    });

    await act(async () => {
      await result.current.askQuestion();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/lectures',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result.current.state.status).toBe('success');
    expect(result.current.state.answer).toBe('Ответ по лекциям');
  });
});
