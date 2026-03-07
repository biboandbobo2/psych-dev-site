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

vi.mock('../../../components/NoteFormFields', () => ({
  NoteFormFields: ({
    title,
    content,
    onTitleChange,
    onContentChange,
  }: {
    title: string;
    content: string;
    onTitleChange: (value: string) => void;
    onContentChange: (value: string) => void;
  }) => (
    <div>
      <label>
        Заголовок заметки
        <input
          aria-label="Заголовок заметки"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <label>
        Ваши размышления
        <textarea
          aria-label="Ваши размышления"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
        />
      </label>
    </div>
  ),
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

    fireEvent.change(screen.getByLabelText('Ваши размышления'), {
      target: { value: 'Ключевой тезис из лекции' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить заметку' }));

    await waitFor(() =>
      expect(mocks.createNote).toHaveBeenCalledWith(
        'Младший школьный возраст: Лекция 1',
        'Ключевой тезис из лекции',
        'primary-school',
        null,
        null
      )
    );

    expect(screen.getByText('Заметка сохранена. Можно продолжать конспект.')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Войти и сохранить' }));

    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(await screen.findByText('Login modal')).toBeInTheDocument();
  });
});
