import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';

const mocks = vi.hoisted(() => ({
  upsertLectureNote: vi.fn(),
  user: { uid: 'user-1' } as { uid: string } | null,
}));

vi.mock('../../../hooks/useNotes', () => ({
  useNotes: () => ({
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
    mocks.upsertLectureNote.mockReset();
    mocks.upsertLectureNote.mockResolvedValue('note-id');
    mocks.user = { uid: 'user-1' };
  });

  it('сохраняет заметку с нормализованным возрастным периодом', async () => {
    renderPanel({
      courseId: 'development',
      lectureResourceId: 'video-1',
      periodId: 'school',
      periodTitle: 'Младший школьный возраст',
      videoTitle: 'Лекция 1',
    });

    fireEvent.change(screen.getByLabelText('Заметки по лекции'), {
      target: { value: 'Ключевой тезис из лекции' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(mocks.upsertLectureNote).toHaveBeenCalledWith(
        'Ключевой тезис из лекции',
        {
          courseId: 'development',
          lectureTitle: 'Лекция 1',
          lectureVideoId: 'video-1',
          periodId: 'school',
          periodTitle: 'Младший школьный возраст (7-10 лет)',
        }
      )
    );

    expect(screen.getByText('Сохранено в /notes')).toBeInTheDocument();
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
