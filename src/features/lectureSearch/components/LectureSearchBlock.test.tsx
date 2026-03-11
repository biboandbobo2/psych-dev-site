import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LectureSearchBlock } from './LectureSearchBlock';

const mockUseLectureAnswer = vi.fn();
const mockSaveSearch = vi.fn();

vi.mock('../hooks/useLectureAnswer', () => ({
  useLectureAnswer: () => mockUseLectureAnswer(),
}));

vi.mock('./LectureSelector', () => ({
  LectureSelector: () => <div>selector</div>,
}));

vi.mock('../../../hooks', () => ({
  useSearchHistory: () => ({
    saveSearch: mockSaveSearch,
  }),
}));

describe('LectureSearchBlock', () => {
  beforeEach(() => {
    mockSaveSearch.mockReset();
    mockUseLectureAnswer.mockReturnValue({
      query: 'Что говорится о памяти?',
      setQuery: vi.fn(),
      selectedCourseId: 'development',
      setSelectedCourseId: vi.fn(),
      useWholeCourse: true,
      setUseWholeCourse: vi.fn(),
      selectedLectureKeys: [],
      setSelectedLectureKeys: vi.fn(),
      state: {
        status: 'success',
        answer: 'Ответ по лекциям',
        citations: [],
        error: null,
        tookMs: 1200,
      },
      askQuestion: vi.fn(),
      clearState: vi.fn(),
      maxLength: 500,
    });
  });

  it('сохраняет успешный ответ по лекциям в историю ai_chat', async () => {
    render(<LectureSearchBlock />);

    await waitFor(() => {
      expect(mockSaveSearch).toHaveBeenCalledWith({
        type: 'ai_chat',
        query: 'Что говорится о памяти?',
        hasAnswer: true,
        aiResponse: 'Ответ по лекциям',
      });
    });
  });
});
