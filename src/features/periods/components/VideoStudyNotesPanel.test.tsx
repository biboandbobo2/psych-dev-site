import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';
import type { LectureNoteSegment } from '../../../types/notes';

const mocks = vi.hoisted(() => ({
  getLectureNote: vi.fn(),
  upsertLectureNote: vi.fn(),
  user: { uid: 'user-1' } as { uid: string } | null,
}));

vi.mock('../../../hooks/useNotes', () => ({
  useNotes: () => ({
    getLectureNote: mocks.getLectureNote,
    upsertLectureNote: mocks.upsertLectureNote,
  }),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { uid: string } | null }) => unknown) =>
    selector({ user: mocks.user }),
}));

vi.mock('../../../components/LoginModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Login modal</div> : null),
}));

function renderPanel(props: {
  courseId: string;
  getPlaybackSnapshot?: () => { currentTimeMs: number | null; paused: boolean };
  initialDraftSegments?: LectureNoteSegment[];
  lectureResourceId: string;
  onTimestampClick?: (startMs: number) => void;
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}) {
  function TestPanel() {
    const [draftSegments, setDraftSegments] = useState<LectureNoteSegment[]>(
      () => props.initialDraftSegments ?? []
    );

    return (
      <VideoStudyNotesPanel
        draftSegments={draftSegments}
        onDraftSegmentsChange={setDraftSegments}
        getPlaybackSnapshot={props.getPlaybackSnapshot}
        onTimestampClick={props.onTimestampClick ?? vi.fn()}
        {...props}
      />
    );
  }

  return render(<TestPanel />);
}

describe('VideoStudyNotesPanel', () => {
  beforeEach(() => {
    mocks.getLectureNote.mockReset();
    mocks.getLectureNote.mockResolvedValue(null);
    mocks.upsertLectureNote.mockReset();
    mocks.upsertLectureNote.mockResolvedValue('note-id');
    mocks.user = { uid: 'user-1' };
  });

  it('подгружает прошлый конспект, сохраняет сегменты и показывает таймкоды по запросу', async () => {
    mocks.getLectureNote.mockResolvedValue({
      id: 'note-1',
      content: 'Старый конспект',
      lectureSegments: [
        {
          id: 'segment-1',
          startMs: 120000,
          text: 'Старый конспект',
        },
      ],
    });
    const handleTimestampClick = vi.fn();

    renderPanel({
      courseId: 'development',
      getPlaybackSnapshot: () => ({ currentTimeMs: 317000, paused: false }),
      initialDraftSegments: [
        {
          id: 'segment-1',
          startMs: 120000,
          text: 'Старый конспект',
        },
      ],
      lectureResourceId: 'video-1',
      onTimestampClick: handleTimestampClick,
      periodId: 'school',
      periodTitle: 'Младший школьный возраст',
      videoTitle: 'Лекция 1',
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByDisplayValue('Старый конспект')).toBeInTheDocument();
    expect(screen.queryByText('Загружаем прошлый конспект...')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Заметки по лекции'), {
      target: { value: 'Ключевой тезис из лекции' },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 950));
    });

    await waitFor(() =>
      expect(mocks.upsertLectureNote).toHaveBeenCalledWith(
        'Старый конспект\n\nКлючевой тезис из лекции',
        {
          courseId: 'development',
          lectureTitle: 'Лекция 1',
          lectureVideoId: 'video-1',
          periodId: 'school',
          periodTitle: 'Младший школьный возраст',
        },
        {
          lectureSegments: [
            {
              id: 'segment-1',
              startMs: 120000,
              text: 'Старый конспект',
            },
            expect.objectContaining({
              startMs: 317000,
              text: 'Ключевой тезис из лекции',
            }),
          ],
        }
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Таймкоды' }));
    fireEvent.click(screen.getByRole('button', { name: '02:00' }));
    expect(handleTimestampClick).toHaveBeenCalledWith(120000);
    expect(screen.getByRole('button', { name: 'Конспект сохранён' })).toBeInTheDocument();
  });

  it('не разбивает непрерывный ввод на отдельные сегменты по символам', async () => {
    renderPanel({
      courseId: 'development',
      getPlaybackSnapshot: () => ({ currentTimeMs: 45000, paused: false }),
      lectureResourceId: 'video-3',
      periodId: 'school',
      periodTitle: 'Младший школьный возраст',
      videoTitle: 'Лекция 3',
    });

    const textarea = screen.getByLabelText('Заметки по лекции');

    fireEvent.change(textarea, { target: { value: 'П' } });
    fireEvent.change(textarea, { target: { value: 'Пр' } });
    fireEvent.change(textarea, { target: { value: 'При' } });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 950));
    });

    await waitFor(() =>
      expect(mocks.upsertLectureNote).toHaveBeenCalledWith(
        'При',
        expect.any(Object),
        {
          lectureSegments: [
            expect.objectContaining({
              startMs: 45000,
              text: 'При',
            }),
          ],
        }
      )
    );
  });

  it('открывает логин-модалку для неавторизованного пользователя', async () => {
    mocks.user = null;

    renderPanel({
      courseId: 'development',
      lectureResourceId: 'video-2',
      periodId: 'preschool',
      periodTitle: 'Дошкольный возраст',
      videoTitle: 'Лекция 2',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(mocks.upsertLectureNote).not.toHaveBeenCalled();
    expect(await screen.findByText('Login modal')).toBeInTheDocument();
  });
});
