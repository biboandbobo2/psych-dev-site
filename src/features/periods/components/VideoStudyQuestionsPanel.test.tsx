import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyQuestionsPanel } from './VideoStudyQuestionsPanel';
import type { LectureQuestion } from '../../../types/lectureQuestions';
import type { SharedLectureNote } from '../../../types/sharedLectureNotes';

const mocks = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  questions: [] as LectureQuestion[],
  sharedNotes: [] as SharedLectureNote[],
  deleteQuestion: vi.fn(),
  deleteSharedNote: vi.fn(),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { uid: string } | null }) => unknown) =>
    selector({ user: mocks.user }),
}));

vi.mock('../../../hooks/useMyGroups', () => ({
  useMyGroups: () => ({ groups: [{ id: 'group-1', isSystem: false }] }),
}));

vi.mock('../../../hooks/useLectureQuestions', () => ({
  useLessonQuestions: () => ({ questions: mocks.questions, loading: false }),
  useLectureQuestionActions: () => ({
    createQuestion: vi.fn(),
    deleteQuestion: mocks.deleteQuestion,
  }),
}));

vi.mock('../../../hooks/useSharedLectureNotes', () => ({
  useLessonSharedNotes: () => ({ sharedNotes: mocks.sharedNotes }),
  useSharedLectureNoteActions: () => ({
    shareLectureNote: vi.fn(),
    deleteSharedNote: mocks.deleteSharedNote,
  }),
}));

vi.mock('../../../components/LoginModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Login modal</div> : null),
}));

vi.mock('./AskLectureQuestionModal', () => ({
  AskLectureQuestionModal: ({ isOpen, startMs }: { isOpen: boolean; startMs: number | null }) =>
    isOpen ? <div>Ask modal at {startMs}</div> : null,
}));

vi.mock('./ShareLectureNoteModal', () => ({
  ShareLectureNoteModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Share modal</div> : null,
}));

function makeQuestion(overrides: Partial<LectureQuestion>): LectureQuestion {
  return {
    id: 'q-1',
    authorUid: 'user-2',
    authorName: 'Мария',
    courseId: 'clinical',
    periodId: 'clinical-1',
    periodTitle: null,
    lectureTitle: null,
    videoId: 'video-1',
    startMs: null,
    text: 'Вопрос по лекции',
    visibility: 'group',
    groupId: 'group-1',
    createdAt: new Date('2026-08-01T10:00:00Z'),
    ...overrides,
  };
}

function renderPanel() {
  return render(
    <VideoStudyQuestionsPanel
      courseId="clinical"
      periodId="clinical-1"
      periodTitle="Занятие"
      lectureTitle="Лекция"
      videoId="video-1"
      noteSegments={[{ id: 's-1', startMs: 1000, text: 'Тезис' }]}
      getPlaybackSnapshot={() => ({ currentTimeMs: 120_000, paused: false })}
      onTimestampClick={vi.fn()}
    />
  );
}

describe('VideoStudyQuestionsPanel', () => {
  beforeEach(() => {
    mocks.user = { uid: 'user-1' };
    mocks.questions = [];
    mocks.sharedNotes = [];
  });

  it('сортирует ленту по моменту лекции, вопросы без якоря — в конец', () => {
    mocks.questions = [
      makeQuestion({ id: 'late', startMs: 300_000, text: 'Поздний вопрос' }),
      makeQuestion({ id: 'unanchored', startMs: null, text: 'Вопрос без момента' }),
      makeQuestion({ id: 'early', startMs: 60_000, text: 'Ранний вопрос' }),
    ];

    renderPanel();

    const texts = screen
      .getAllByText(/вопрос/i)
      .map((node) => node.textContent)
      .filter((text) => text?.includes('вопрос') || text?.includes('Вопрос'));
    const order = ['Ранний вопрос', 'Поздний вопрос', 'Вопрос без момента'].map((expected) =>
      texts.findIndex((text) => text === expected)
    );
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  it('таймкод вопроса перематывает видео, «Спросить лектора» открывает модалку с текущим моментом', () => {
    const onTimestampClick = vi.fn();
    mocks.questions = [makeQuestion({ startMs: 60_000 })];

    render(
      <VideoStudyQuestionsPanel
        courseId="clinical"
        periodId="clinical-1"
        periodTitle="Занятие"
        lectureTitle="Лекция"
        videoId="video-1"
        noteSegments={[]}
        getPlaybackSnapshot={() => ({ currentTimeMs: 120_000, paused: false })}
        onTimestampClick={onTimestampClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Перейти к 01:00' }));
    expect(onTimestampClick).toHaveBeenCalledWith(60_000);

    fireEvent.click(screen.getByRole('button', { name: 'Спросить лектора' }));
    expect(screen.getByText('Ask modal at 120000')).toBeInTheDocument();
  });

  it('«Поделиться конспектом» недоступна без сегментов и открывает модалку при их наличии', () => {
    mocks.questions = [];

    const { rerender } = render(
      <VideoStudyQuestionsPanel
        courseId="clinical"
        periodId="clinical-1"
        periodTitle="Занятие"
        lectureTitle="Лекция"
        videoId="video-1"
        noteSegments={[]}
        getPlaybackSnapshot={() => ({ currentTimeMs: null, paused: true })}
        onTimestampClick={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Поделиться конспектом' })).toBeDisabled();

    rerender(
      <VideoStudyQuestionsPanel
        courseId="clinical"
        periodId="clinical-1"
        periodTitle="Занятие"
        lectureTitle="Лекция"
        videoId="video-1"
        noteSegments={[{ id: 's-1', startMs: null, text: 'Тезис' }]}
        getPlaybackSnapshot={() => ({ currentTimeMs: null, paused: true })}
        onTimestampClick={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Поделиться конспектом' }));
    expect(screen.getByText('Share modal')).toBeInTheDocument();
  });

  it('чип «только вопросы» скрывает фрагменты конспектов из ленты', () => {
    mocks.questions = [makeQuestion({ startMs: 60_000, text: 'Вопрос группы' })];
    mocks.sharedNotes = [
      {
        id: 'share-1',
        authorUid: 'user-2',
        authorName: 'Пётр',
        courseId: 'clinical',
        periodId: 'clinical-1',
        periodTitle: null,
        lectureTitle: null,
        videoId: 'video-1',
        segments: [{ id: 's-1', startMs: 30_000, text: 'Фрагмент конспекта' }],
        visibility: 'group',
        groupId: 'group-1',
        createdAt: new Date('2026-08-01T10:00:00Z'),
      },
    ];

    renderPanel();

    expect(screen.getByText('Фрагмент конспекта')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Показывать только вопросы' }));
    expect(screen.queryByText('Фрагмент конспекта')).not.toBeInTheDocument();
    expect(screen.getByText('Вопрос группы')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Показывать только вопросы' }));
    expect(screen.getByText('Фрагмент конспекта')).toBeInTheDocument();
  });

  it('гостю показывает вход вместо ленты', () => {
    mocks.user = null;

    renderPanel();

    expect(screen.queryByRole('button', { name: 'Спросить лектора' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByText('Login modal')).toBeInTheDocument();
  });
});
