import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DisorderTable from '../DisorderTable';
import type { DisorderTableEntry } from '../../features/disorderTable';

type HookState = {
  entries: DisorderTableEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  canEdit: boolean;
  targetOwnerUid: string | null;
  setTargetOwnerUid: ReturnType<typeof vi.fn>;
  createEntry: ReturnType<typeof vi.fn>;
  createEntriesBatch: ReturnType<typeof vi.fn>;
  updateEntry: ReturnType<typeof vi.fn>;
  removeEntry: ReturnType<typeof vi.fn>;
};

type CommentsHookState = {
  comments: Array<{
    id: string;
    entryId: string;
    text: string;
    authorUid: string;
    authorName: string;
    createdAt: Date;
  }>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  canComment: boolean;
  createComment: ReturnType<typeof vi.fn>;
};

type StudentsHookState = {
  students: Array<{
    uid: string;
    displayName: string;
    email: string;
  }>;
  loading: boolean;
  error: string | null;
};

let mockHookState: HookState;
let mockCommentsHookState: CommentsHookState;
let mockStudentsHookState: StudentsHookState;

vi.mock('../../stores', () => ({
  useCourseStore: () => ({ currentCourse: 'clinical' }),
}));

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      uid: 'student-1',
      displayName: 'Student One',
      email: 'student1@example.com',
    },
    isAdmin: false,
  }),
}));

vi.mock('../../features/disorderTable', async () => {
  const actual = await vi.importActual<typeof import('../../features/disorderTable')>('../../features/disorderTable');
  return {
    ...actual,
    useDisorderTableEntries: () => mockHookState,
    useDisorderTableComments: () => mockCommentsHookState,
    useDisorderTableStudents: () => mockStudentsHookState,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <DisorderTable />
    </MemoryRouter>
  );
}

function createEntry(id: string, rowId: string, columnId: string, text: string): DisorderTableEntry {
  const now = new Date('2026-03-15T10:00:00.000Z');
  return {
    id,
    rowIds: [rowId],
    columnIds: [columnId],
    text,
    track: 'patopsychology',
    createdAt: now,
    updatedAt: now,
  };
}

describe('DisorderTable page', () => {
  beforeEach(() => {
    mockHookState = {
      entries: [],
      loading: false,
      saving: false,
      error: null,
      canEdit: true,
      targetOwnerUid: 'student-1',
      setTargetOwnerUid: vi.fn(),
      createEntry: vi.fn(),
      createEntriesBatch: vi.fn().mockResolvedValue(undefined),
      updateEntry: vi.fn(),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    };
    mockCommentsHookState = {
      comments: [],
      loading: false,
      saving: false,
      error: null,
      canComment: false,
      createComment: vi.fn().mockResolvedValue(undefined),
    };
    mockStudentsHookState = {
      students: [],
      loading: false,
      error: null,
    };
  });

  it('применяет фильтры только после кнопки "Применить фильтр"', () => {
    renderPage();

    const getHeaderButtons = () => {
      const table = screen.getByRole('table');
      const [thead] = within(table).getAllByRole('rowgroup');
      return within(thead).getAllByRole('button');
    };

    const initialHeaderButtons = getHeaderButtons();
    expect(initialHeaderButtons).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: 'Тревожные расстройства' }));
    const afterDraftHeaderButtons = getHeaderButtons();
    expect(afterDraftHeaderButtons).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: 'Применить фильтр' }));
    const afterApplyHeaderButtons = getHeaderButtons();
    expect(afterApplyHeaderButtons).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Тревожные расстройства' })).toBeInTheDocument();
  });

  it('открывает модалку пересечения с полным текстом', () => {
    mockHookState.entries = [
      createEntry(
        'e1',
        'perception',
        'schizophrenic-spectrum',
        'Очень длинный полный текст наблюдения для проверки модального окна пересечения'
      ),
    ];

    renderPage();

    const filledCellButton = screen.getAllByRole('button').find((button) =>
      button.textContent?.includes('Очень длинный полный текст наблюдения для проверки модального окна пересечения')
    );
    expect(filledCellButton).toBeDefined();
    if (!filledCellButton) {
      throw new Error('Filled disorder-table cell not found');
    }
    fireEvent.click(filledCellButton);

    expect(
      screen.getByRole('heading', { name: /Нарушения восприятия × Расстройства шизофренического спектра/i })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Очень длинный полный текст наблюдения для проверки модального окна пересечения').length
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Добавить в это пересечение' })).toBeInTheDocument();
  });

  it('массово вносит текст в выбранные пересечения', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Выбрать несколько ячеек|Режим выбора/i }));

    const emptyCells = screen.getAllByRole('button', { name: 'Пусто' });
    fireEvent.click(emptyCells[0]);
    fireEvent.click(emptyCells[1]);

    fireEvent.click(screen.getByRole('button', { name: /Внести текст в выбранные/i }));

    fireEvent.change(screen.getByPlaceholderText('Введите текст, который нужно добавить во все выбранные пересечения'), {
      target: { value: '  Один текст для нескольких ячеек  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить во все выбранные' }));

    await waitFor(() => {
      expect(mockHookState.createEntriesBatch).toHaveBeenCalledTimes(1);
    });

    const batchArg = mockHookState.createEntriesBatch.mock.calls[0][0];
    expect(batchArg).toHaveLength(2);
    expect(batchArg[0].text).toBe('Один текст для нескольких ячеек');
    expect(batchArg[0].rowIds).toHaveLength(1);
    expect(batchArg[0].columnIds).toHaveLength(1);
    expect(batchArg[1].rowIds).toHaveLength(1);
    expect(batchArg[1].columnIds).toHaveLength(1);
  });
});
