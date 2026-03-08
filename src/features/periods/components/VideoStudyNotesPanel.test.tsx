import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';

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
  lectureResourceId: string;
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}) {
  function TestPanel() {
    const [draftContent, setDraftContent] = useState('');

    return (
      <VideoStudyNotesPanel
        draftContent={draftContent}
        onDraftChange={setDraftContent}
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

  it('подгружает прошлый конспект и автосохраняет полный текст в ту же lecture note', async () => {
    mocks.getLectureNote.mockResolvedValue({
      id: 'note-1',
      content: 'Старый конспект',
    });

    renderPanel({
      courseId: 'development',
      lectureResourceId: 'video-1',
      periodId: 'school',
      periodTitle: 'Младший школьный возраст',
      videoTitle: 'Лекция 1',
    });

    await act(async () => {});

    expect(screen.getByLabelText('Заметки по лекции')).toHaveValue('Старый конспект');
    expect(screen.queryByText('Загружаем прошлый конспект...')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Заметки по лекции'), {
      target: { value: 'Старый конспект\nКлючевой тезис из лекции' },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 950));
    });

    await waitFor(() =>
      expect(mocks.upsertLectureNote).toHaveBeenCalledWith(
        'Старый конспект\nКлючевой тезис из лекции',
        {
          courseId: 'development',
          lectureTitle: 'Лекция 1',
          lectureVideoId: 'video-1',
          periodId: 'school',
          periodTitle: 'Младший школьный возраст',
        }
      )
    );

    expect(screen.getByLabelText('Заметки по лекции')).toHaveValue('Старый конспект\nКлючевой тезис из лекции');
    expect(screen.getByRole('button', { name: 'Конспект сохранён' })).toBeInTheDocument();
    expect(screen.getByText('Конспект сохранён')).toBeInTheDocument();
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
