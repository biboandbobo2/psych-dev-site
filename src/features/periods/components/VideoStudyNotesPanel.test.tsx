import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoStudyNotesPanel } from './VideoStudyNotesPanel';

const mocks = vi.hoisted(() => ({
  createNote: vi.fn(),
  user: { uid: 'user-1' } as { uid: string } | null,
}));

vi.mock('../../../hooks/useNotes', () => ({
  useNotes: () => ({
    createNote: mocks.createNote,
  }),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { uid: string } | null }) => unknown) =>
    selector({ user: mocks.user }),
}));

vi.mock('../../../components/LoginModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Login modal</div> : null),
}));

describe('VideoStudyNotesPanel', () => {
  beforeEach(() => {
    mocks.createNote.mockReset();
    mocks.createNote.mockResolvedValue('note-id');
    mocks.user = { uid: 'user-1' };
  });

  it('сохраняет заметку с нормализованным возрастным периодом', async () => {
    render(
      <VideoStudyNotesPanel
        periodId="school"
        periodTitle="Младший школьный возраст"
        videoTitle="Лекция 1"
      />
    );

    fireEvent.change(screen.getByLabelText('Заметки по лекции'), {
      target: { value: 'Ключевой тезис из лекции' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(mocks.createNote).toHaveBeenCalledWith(
        'Заметки по лекции',
        'Ключевой тезис из лекции',
        'primary-school',
        null,
        null
      )
    );

    expect(screen.getByText('Сохранено в /notes')).toBeInTheDocument();
  });

  it('открывает логин-модалку для неавторизованного пользователя', async () => {
    mocks.user = null;

    render(
      <VideoStudyNotesPanel
        periodId="preschool"
        periodTitle="Дошкольный возраст"
        videoTitle="Лекция 2"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(await screen.findByText('Login modal')).toBeInTheDocument();
  });
});
