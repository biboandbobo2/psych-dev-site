import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyQuestionsPanel } from './VideoStudyQuestionsPanel';
import type { LectureQuestion } from '../../../types/lectureQuestions';
import type { OpenLectureNote } from '../../../hooks/useOpenLectureNotes';
import type { UserRole } from '../../../types/user';

const mocks = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  userRole: null as UserRole | null,
  adminEditableCourses: [] as string[],
  groupQuestions: [] as LectureQuestion[],
  allQuestions: [] as LectureQuestion[],
  groupOpenNotes: [] as OpenLectureNote[],
  allOpenNotes: [] as OpenLectureNote[],
  deleteQuestion: vi.fn(),
  lessonQuestionsScope: [] as Array<string | null>,
  allQuestionsScope: [] as Array<string | null>,
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: {
      user: { uid: string } | null;
      userRole: UserRole | null;
      adminEditableCourses: string[];
    }) => unknown
  ) =>
    selector({
      user: mocks.user,
      userRole: mocks.userRole,
      adminEditableCourses: mocks.adminEditableCourses,
    }),
}));

vi.mock('../../../hooks/useMyGroups', () => ({
  useMyGroups: () => ({ groups: [{ id: 'group-1', isSystem: false }], loading: false }),
}));

vi.mock('../../../hooks/useLectureQuestions', () => ({
  useLessonQuestions: (courseId: string | null) => {
    mocks.lessonQuestionsScope.push(courseId);
    return { questions: courseId ? mocks.groupQuestions : [], loading: false };
  },
  useLessonAllQuestions: (courseId: string | null) => {
    mocks.allQuestionsScope.push(courseId);
    return { questions: courseId ? mocks.allQuestions : [], loading: false };
  },
  useLectureQuestionActions: () => ({
    createQuestion: vi.fn(),
    deleteQuestion: mocks.deleteQuestion,
  }),
}));

vi.mock('../../../hooks/useOpenLectureNotes', () => ({
  useLessonGroupOpenNotes: (courseId: string | null) =>
    courseId ? mocks.groupOpenNotes : [],
  useLessonAllOpenNotes: (courseId: string | null) =>
    courseId ? mocks.allOpenNotes : [],
}));

vi.mock('../../../components/LoginModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Login modal</div> : null),
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
    sourceSegmentId: null,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    ...overrides,
  };
}

function makeOpenNote(overrides: Partial<OpenLectureNote>): OpenLectureNote {
  return {
    id: 'note-1',
    userId: 'user-2',
    authorName: 'Пётр',
    lectureVideoId: 'video-1',
    visibility: 'group',
    segments: [{ id: 's-1', startMs: 30_000, text: 'Дисрегуляция — когда система…' }],
    updatedAt: new Date('2026-08-01T10:00:00Z'),
    ...overrides,
  };
}

function renderPanel(noteSegments: Array<{ id: string; startMs: number | null; text: string }> = []) {
  return render(
    <VideoStudyQuestionsPanel
      courseId="clinical"
      periodId="clinical-1"
      videoId="video-1"
      noteSegments={noteSegments}
      onTimestampClick={vi.fn()}
    />
  );
}

describe('VideoStudyQuestionsPanel', () => {
  beforeEach(() => {
    mocks.user = { uid: 'user-1' };
    mocks.userRole = null;
    mocks.adminEditableCourses = [];
    mocks.groupQuestions = [];
    mocks.allQuestions = [];
    mocks.groupOpenNotes = [];
    mocks.allOpenNotes = [];
    mocks.deleteQuestion.mockReset();
    mocks.lessonQuestionsScope = [];
    mocks.allQuestionsScope = [];
  });

  it('единая лента: вопросы, абзацы открытых конспектов и свои записи по таймкодам', () => {
    mocks.groupQuestions = [
      makeQuestion({ id: 'late', startMs: 300_000, text: 'Поздний вопрос' }),
    ];
    mocks.groupOpenNotes = [makeOpenNote({})];

    renderPanel([{ id: 'own-1', startMs: 100_000, text: 'Мой тезис' }]);

    const texts = screen
      .getAllByText(/Дисрегуляция|Мой тезис|Поздний вопрос/)
      .map((node) => node.textContent);
    // 00:30 конспект Петра → 01:40 свой абзац → 05:00 вопрос
    expect(texts).toEqual(['Дисрегуляция — когда система…', 'Мой тезис', 'Поздний вопрос']);
    expect(screen.getByText('Пётр')).toBeInTheDocument();
    expect(screen.getByText('Вы')).toBeInTheDocument();
  });

  it('чужой конспект другой лекции занятия в ленту не попадает', () => {
    mocks.groupOpenNotes = [makeOpenNote({ lectureVideoId: 'other-video' })];

    renderPanel();

    expect(screen.queryByText(/Дисрегуляция/)).not.toBeInTheDocument();
  });

  it('чип «только вопросы» скрывает абзацы конспектов', () => {
    mocks.groupQuestions = [makeQuestion({ startMs: 60_000, text: 'Вопрос группы' })];
    mocks.groupOpenNotes = [makeOpenNote({})];

    renderPanel();

    expect(screen.getByText(/Дисрегуляция/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Показывать только вопросы' }));
    expect(screen.queryByText(/Дисрегуляция/)).not.toBeInTheDocument();
    expect(screen.getByText('Вопрос группы')).toBeInTheDocument();
  });

  it('лекторский режим: вопросы всех групп и открытые конспекты, групповые хуки выключены', () => {
    mocks.userRole = 'admin';
    mocks.adminEditableCourses = ['clinical'];
    mocks.allQuestions = [makeQuestion({ text: 'Вопрос из другой группы', groupId: 'group-9' })];
    mocks.allOpenNotes = [makeOpenNote({ visibility: 'lecturers' })];

    renderPanel();

    expect(screen.getByText('Лекторский режим: все вопросы занятия')).toBeInTheDocument();
    expect(screen.getByText('Вопрос из другой группы')).toBeInTheDocument();
    expect(screen.getByText(/Дисрегуляция/)).toBeInTheDocument();
    expect(screen.getByText('только лекторам')).toBeInTheDocument();
    // студенческий хук получил null-скоуп (листенеры не открыты)
    expect(mocks.lessonQuestionsScope.every((scope) => scope === null)).toBe(true);
    expect(mocks.allQuestionsScope.some((scope) => scope === 'clinical')).toBe(true);
  });

  it('гостю показывает вход вместо ленты', () => {
    mocks.user = null;

    renderPanel();

    expect(screen.queryByRole('button', { name: 'Показывать только вопросы' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByText('Login modal')).toBeInTheDocument();
  });
});
