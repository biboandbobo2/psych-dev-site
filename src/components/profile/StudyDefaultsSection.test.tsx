import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setDoc } from 'firebase/firestore';
import { StudyDefaultsSection } from './StudyDefaultsSection';

const mocks = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  accountDefault: null as 'group' | 'lecturers' | null,
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
    }) => unknown
  ) =>
    selector({
      user: mocks.user,
      studyQuestionsDefaultVisibility: mocks.accountDefault,
    }),
}));

describe('StudyDefaultsSection', () => {
  const setDocMock = vi.mocked(setDoc);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { uid: 'user-1' };
    mocks.accountDefault = null;
    setDocMock.mockResolvedValue(undefined);
  });

  it('дефолт без сохранённого значения — «группа и лекторы», выбор пишет studyDefaults с merge', async () => {
    render(<StudyDefaultsSection />);

    expect(screen.getByRole('radio', { name: 'Моя группа и лекторы' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Только лекторы курса' }));

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

    const lecturersRadio = screen.getByRole('radio', { name: 'Только лекторы курса' });
    expect(lecturersRadio).toBeChecked();

    fireEvent.click(lecturersRadio);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
