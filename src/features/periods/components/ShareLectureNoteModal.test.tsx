import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareLectureNoteModal } from './ShareLectureNoteModal';
import { useMyGroups } from '../../../hooks/useMyGroups';
import { MAX_SHARED_NOTE_SEGMENTS } from '../../../types/sharedLectureNotes';
import type { LectureNoteSegment } from '../../../types/notes';

vi.mock('../../../hooks/useMyGroups', () => ({
  useMyGroups: vi.fn(() => ({ groups: [], loading: false })),
}));

vi.mock('../../../hooks/useSharedLectureNotes', () => ({
  useSharedLectureNoteActions: vi.fn(() => ({ shareLectureNote: vi.fn() })),
}));

vi.mock('../../../stores/useAuthStore', () => {
  const state = { user: { uid: 'user-1' } };
  return {
    useAuthStore: vi.fn((selector: (s: typeof state) => unknown) => selector(state)),
  };
});

const useMyGroupsMock = vi.mocked(useMyGroups);

function makeSegments(count: number): LectureNoteSegment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `seg-${index}`,
    startMs: index * 1000,
    text: `Сегмент ${index}`,
  }));
}

function renderModal(segments: LectureNoteSegment[]) {
  return render(
    <ShareLectureNoteModal
      isOpen
      onClose={() => {}}
      segments={segments}
      courseId="course-1"
      periodId="period-1"
      periodTitle="Занятие 1"
    />
  );
}

describe('ShareLectureNoteModal — лимит сегментов', () => {
  beforeEach(() => {
    useMyGroupsMock.mockReturnValue({ groups: [], loading: false } as ReturnType<
      typeof useMyGroups
    >);
  });

  it('блокирует отправку и показывает подсказку при 101 предвыбранном сегменте', () => {
    renderModal(makeSegments(MAX_SHARED_NOTE_SEGMENTS + 1));

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
    expect(
      screen.getByText(/Выбрано 101 сегментов — максимум 100\. Снимите лишние\./)
    ).toBeInTheDocument();
  });

  it('разрешает отправку при ровно 100 сегментах без подсказки', () => {
    renderModal(makeSegments(MAX_SHARED_NOTE_SEGMENTS));

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled();
    expect(screen.queryByText(/максимум 100/)).not.toBeInTheDocument();
  });
});

describe('ShareLectureNoteModal — дорезолв групп', () => {
  it('подхватывает группу, когда группы загрузились после открытия модалки', () => {
    useMyGroupsMock.mockReturnValue({ groups: [], loading: true } as ReturnType<
      typeof useMyGroups
    >);
    const { rerender } = renderModal(makeSegments(1));

    useMyGroupsMock.mockReturnValue({
      groups: [{ id: 'group-1', name: 'Группа 1', memberIds: ['user-1'] }],
      loading: false,
    } as ReturnType<typeof useMyGroups>);
    rerender(
      <ShareLectureNoteModal
        isOpen
        onClose={() => {}}
        segments={makeSegments(1)}
        courseId="course-1"
        periodId="period-1"
        periodTitle="Занятие 1"
      />
    );

    // Видимость «группе» активна, groupId дорезолвился из targetGroups[0] —
    // кнопка отправки доступна (до фикса groupId оставался null).
    expect(screen.getByRole('radio', { name: /Моей группе и лекторам/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeEnabled();
  });
});
