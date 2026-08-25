import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyOverlay } from './VideoStudyOverlay';
import type { LectureNoteSaveStatus } from './VideoStudyNotesPanel';
import type { LectureNoteSegment } from '../../../types/notes';
import type { LectureQuestion } from '../../../types/lectureQuestions';

const mocks = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  myQuestions: [] as LectureQuestion[],
  createQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));

vi.mock('./StudyVideoPlayer', () => ({
  StudyVideoPlayer: () => <div>Player</div>,
}));

vi.mock('./VideoStudyNotesPanel', () => ({
  VideoStudyNotesPanel: ({
    onSaveStatusChange,
    showTimestamps,
    questionedSegmentIds,
    onToggleSegmentQuestion,
  }: {
    onSaveStatusChange?: (status: LectureNoteSaveStatus) => void;
    showTimestamps: boolean;
    questionedSegmentIds?: ReadonlySet<string>;
    onToggleSegmentQuestion?: (segment: LectureNoteSegment) => void;
  }) => (
    <div>
      <div>Notes panel, timestamps: {showTimestamps ? 'on' : 'off'}</div>
      <div>questioned: {[...(questionedSegmentIds ?? [])].join(',') || 'none'}</div>
      <button type="button" onClick={() => onSaveStatusChange?.('saved')}>
        report saved
      </button>
      <button
        type="button"
        onClick={() =>
          onToggleSegmentQuestion?.({ id: 'seg-1', startMs: 1000, text: 'Тезис по лекции' })
        }
      >
        toggle segment question
      </button>
    </div>
  ),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: {
      user: { uid: string } | null;
      studyQuestionsDefaultVisibility: 'group' | 'lecturers' | null;
    }) => unknown
  ) => selector({ user: mocks.user, studyQuestionsDefaultVisibility: null }),
}));

vi.mock('../../../hooks/useMyGroups', () => ({
  useMyGroups: () => ({ groups: [{ id: 'group-1', isSystem: false }], loading: false }),
}));

vi.mock('../../../hooks/useLectureQuestions', () => ({
  useMyLectureQuestions: () => mocks.myQuestions,
  useLectureQuestionActions: () => ({
    createQuestion: mocks.createQuestion,
    deleteQuestion: mocks.deleteQuestion,
  }),
}));

vi.mock('./VideoStudyQuestionsPanel', () => ({
  VideoStudyQuestionsPanel: () => <div>Questions panel</div>,
}));

vi.mock('./VideoTranscriptPanel', () => ({
  VideoTranscriptPanel: () => <div>Transcript panel</div>,
}));

vi.mock('./TranscriptExplainCard', () => ({
  TranscriptExplainCard: () => null,
}));

vi.mock('../hooks/useLectureExplain', () => ({
  useLectureExplain: () => ({
    state: { status: 'idle' },
    explain: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock('../../../hooks', () => ({
  useVideoTranscript: () => ({
    error: null,
    hasTranscript: false,
    isChecking: false,
    isLoading: false,
    metadata: null,
    transcript: null,
  }),
}));

vi.mock('../../../lib/telemetry', () => ({
  trackFeatureEvent: vi.fn(),
}));

function renderOverlay(onClose = vi.fn()) {
  render(
    <VideoStudyOverlay
      courseId="development"
      draft={{ segments: [], updatedAtMs: null }}
      embedUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
      isOpen
      onClose={onClose}
      onDraftChange={vi.fn()}
      originalUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      periodId="preschool"
      periodTitle="Дошкольный возраст"
      videoTitle="Лекция 1"
    />
  );
  return onClose;
}

describe('VideoStudyOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.user = { uid: 'user-1' };
    mocks.myQuestions = [];
    mocks.createQuestion.mockResolvedValue('question-id');
    mocks.deleteQuestion.mockResolvedValue(undefined);
  });

  it('вкладка ленты называется «Чат», панель конспекта не размонтируется при переключении', () => {
    renderOverlay();

    expect(screen.getByText(/Notes panel/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Чат' }));

    expect(screen.getByText('Questions panel')).toBeInTheDocument();
    // Конспект остаётся смонтированным (скрыт CSS), автосейв продолжает работать
    expect(screen.getByText(/Notes panel/)).toBeInTheDocument();
  });

  it('шестерёнка открывает настройки, тумблер включает таймкоды в конспекте', () => {
    renderOverlay();

    expect(screen.getByText('Notes panel, timestamps: off')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки конспекта' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Таймкоды в конспекте' }));

    expect(screen.getByText('Notes panel, timestamps: on')).toBeInTheDocument();
  });

  it('Esc закрывает поповер настроек, а не весь оверлей', () => {
    const onClose = renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки конспекта' }));
    expect(screen.getByRole('switch', { name: 'Таймкоды в конспекте' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('switch', { name: 'Таймкоды в конспекте' })
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('индикатор в строке вкладок отражает статус автосейва панели', () => {
    renderOverlay();

    expect(
      screen.getByRole('button', { name: 'Автосохранение включено' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'report saved' }));

    expect(screen.getByRole('button', { name: 'Конспект сохранён' })).toBeInTheDocument();
  });

  it('«?» на абзаце создаёт вопрос-снапшот с настройкой видимости из шестерёнки', async () => {
    renderOverlay();

    fireEvent.click(screen.getByRole('button', { name: 'toggle segment question' }));

    expect(mocks.createQuestion).toHaveBeenCalledWith({
      courseId: 'development',
      periodId: 'preschool',
      periodTitle: 'Дошкольный возраст',
      lectureTitle: 'Лекция 1',
      videoId: 'dQw4w9WgXcQ',
      startMs: 1000,
      text: 'Тезис по лекции',
      visibility: 'group',
      groupId: 'group-1',
      sourceSegmentId: 'seg-1',
    });

    // «Только лекторы» per-lecture: пишется в localStorage и меняет payload
    fireEvent.click(screen.getByRole('button', { name: 'Настройки конспекта' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Только лекторы' }));
    expect(
      localStorage.getItem('studyQuestionsVisibility:development::preschool::dQw4w9WgXcQ')
    ).toBe('lecturers');

    fireEvent.click(screen.getByRole('button', { name: 'toggle segment question' }));
    expect(mocks.createQuestion).toHaveBeenLastCalledWith(
      expect.objectContaining({ visibility: 'lecturers', groupId: null })
    );
  });

  it('повторный «?» по отмеченному абзацу удаляет свой вопрос', () => {
    mocks.myQuestions = [
      {
        id: 'question-9',
        authorUid: 'user-1',
        authorName: null,
        courseId: 'development',
        periodId: 'preschool',
        periodTitle: null,
        lectureTitle: null,
        videoId: 'dQw4w9WgXcQ',
        startMs: 1000,
        text: 'Тезис по лекции',
        visibility: 'group',
        groupId: 'group-1',
        sourceSegmentId: 'seg-1',
        createdAt: new Date('2026-08-01T10:00:00Z'),
      },
    ];

    renderOverlay();

    expect(screen.getByText('questioned: seg-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'toggle segment question' }));
    expect(mocks.deleteQuestion).toHaveBeenCalledWith('question-9');
    expect(mocks.createQuestion).not.toHaveBeenCalled();
  });
});
