import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setDoc } from 'firebase/firestore';
import { StudyDefaultsSection } from './StudyDefaultsSection';

const mocks = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  accountDefault: null as 'group' | 'lecturers' | null,
  noteDefault: null as 'private' | 'group' | 'lecturers' | null,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  setDoc: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: {
      user: { uid: string } | null;
      studyQuestionsDefaultVisibility: 'group' | 'lecturers' | null;
      studyNoteDefaultVisibility: 'private' | 'group' | 'lecturers' | null;
    }) => unknown
  ) =>
    selector({
      user: mocks.user,
      studyQuestionsDefaultVisibility: mocks.accountDefault,
      studyNoteDefaultVisibility: mocks.noteDefault,
    }),
}));

describe('StudyDefaultsSection', () => {
  const setDocMock = vi.mocked(setDoc);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { uid: 'user-1' };
    mocks.accountDefault = null;
    mocks.noteDefault = null;
    setDocMock.mockResolvedValue(undefined);
  });

  it('дефолт без сохранённого значения — «группа и лекторы», выбор пишет studyDefaults с merge', async () => {
    render(<StudyDefaultsSection />);

    expect(screen.getAllByRole('radio', { name: 'Моя группа и лекторы' })[0]).toBeChecked();

    fireEvent.click(screen.getAllByRole('radio', { name: 'Только лекторы курса' })[0]);

    await waitFor(() =>
      expect(setDocMock).toHaveBeenCalledWith(
        { path: 'users/user-1' },
        { studyDefaults: { questionsVisibility: 'lecturers' } },
        { merge: true }
      )
    );
  });

  it('показывает сохранённый дефолт из стора и не пишет при выборе того же значения', () => {
    mocks.accountDefault = 'lecturers';

    render(<StudyDefaultsSection />);

    const lecturersRadio = screen.getAllByRole('radio', { name: 'Только лекторы курса' })[0];
    expect(lecturersRadio).toBeChecked();

    fireEvent.click(lecturersRadio);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('дефолт конспекта — «только я», выбор группы пишет noteVisibility', async () => {
    render(<StudyDefaultsSection />);

    expect(screen.getByRole('radio', { name: 'Только я' })).toBeChecked();

    fireEvent.click(screen.getAllByRole('radio', { name: 'Моя группа и лекторы' })[1]);

    await waitFor(() =>
      expect(setDocMock).toHaveBeenCalledWith(
        { path: 'users/user-1' },
        { studyDefaults: { noteVisibility: 'group' } },
        { merge: true }
      )
    );
  });
});
