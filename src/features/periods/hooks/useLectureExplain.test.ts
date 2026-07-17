import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLectureExplain } from './useLectureExplain';
import { fetchLectureAnswer } from '../../lectureSearch/lib/fetchLectureAnswer';

vi.mock('../../lectureSearch/lib/fetchLectureAnswer', () => ({
  fetchLectureAnswer: vi.fn(),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: {
    geminiApiKey: string | null;
    user: { uid: string } | null;
  }) => unknown) =>
    selector({
      geminiApiKey: null,
      user: { uid: 'user-1' },
    }),
}));

const fetchLectureAnswerMock = vi.mocked(fetchLectureAnswer);

describe('useLectureExplain', () => {
  beforeEach(() => {
    fetchLectureAnswerMock.mockReset();
  });

  it('шлёт вопрос с фрагментом, ограниченным текущей лекцией', async () => {
    fetchLectureAnswerMock.mockResolvedValue({
      answer: 'Это про сепарационную тревогу.',
      citations: [],
      tookMs: 100,
    });

    const { result } = renderHook(() =>
      useLectureExplain('general', 'general::infancy::abc123')
    );

    await act(async () => {
      await result.current.explain('тревога при разлуке с матерью');
    });

    expect(fetchLectureAnswerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'general',
        lectureKeys: ['general::infancy::abc123'],
        query: expect.stringContaining('тревога при разлуке с матерью'),
      })
    );
    expect(result.current.state.status).toBe('success');
    expect(result.current.state.answer).toContain('сепарационную');
    expect(result.current.state.fragment).toBe('тревога при разлуке с матерью');
  });

  it('обрезает длинный фрагмент до 400 символов', async () => {
    fetchLectureAnswerMock.mockResolvedValue({ answer: 'ok', citations: [], tookMs: 1 });

    const { result } = renderHook(() => useLectureExplain('general', null));
    const long = 'а'.repeat(600);

    await act(async () => {
      await result.current.explain(long);
    });

    expect(result.current.state.fragment?.length).toBe(400);
    expect(fetchLectureAnswerMock).toHaveBeenCalledWith(
      expect.objectContaining({ lectureKeys: [] })
    );
  });

  it('показывает ошибку и позволяет очистить состояние', async () => {
    fetchLectureAnswerMock.mockRejectedValue(new Error('Сначала добавьте Gemini ключ'));

    const { result } = renderHook(() => useLectureExplain('general', null));

    await act(async () => {
      await result.current.explain('фрагмент');
    });
    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toContain('Gemini');

    act(() => {
      result.current.clear();
    });
    expect(result.current.state.status).toBe('idle');
  });
});
