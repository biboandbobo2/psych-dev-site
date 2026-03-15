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
  createEntry: ReturnType<typeof vi.fn>;
  createEntriesBatch: ReturnType<typeof vi.fn>;
  updateEntry: ReturnType<typeof vi.fn>;
  removeEntry: ReturnType<typeof vi.fn>;
};

let mockHookState: HookState;

vi.mock('../../stores', () => ({
  useCourseStore: () => ({ currentCourse: 'clinical' }),
}));

vi.mock('../../features/disorderTable', async () => {
  const actual = await vi.importActual<typeof import('../../features/disorderTable')>('../../features/disorderTable');
  return {
    ...actual,
    useDisorderTableEntries: () => mockHookState,
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
      createEntry: vi.fn(),
      createEntriesBatch: vi.fn().mockResolvedValue(undefined),
      updateEntry: vi.fn(),
      removeEntry: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('применяет фильтры только после кнопки "Применить фильтр"', () => {
    renderPage();

    const table = screen.getByRole('table');
    const thead = within(table).getByRole('rowgroup');
    const initialHeaderButtons = within(thead).getAllByRole('button');
    expect(initialHeaderButtons).toHaveLength(8);

    fireEvent.click(screen.getByRole('button', { name: 'Тревожные расстройства' }));
    const afterDraftHeaderButtons = within(thead).getAllByRole('button');
    expect(afterDraftHeaderButtons).toHaveLength(8);

    fireEvent.click(screen.getByRole('button', { name: 'Применить фильтр' }));
    const afterApplyHeaderButtons = within(thead).getAllByRole('button');
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

    fireEvent.click(
      screen.getByRole('button', {
        name: /Очень длинный полный текст наблюдения для проверки модального окна пересечения/i,
      })
    );

    expect(
      screen.getByRole('heading', { name: 'Нарушения восприятия × Расстройства шизофренического спектра' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Очень длинный полный текст наблюдения для проверки модального окна пересечения')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить в это пересечение' })).toBeInTheDocument();
  });

  it('массово вносит текст в выбранные пересечения', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Выбрать несколько ячеек' }));

    const emptyCells = screen.getAllByRole('button', { name: 'Пусто' });
    fireEvent.click(emptyCells[0]);
    fireEvent.click(emptyCells[1]);

    fireEvent.click(screen.getByRole('button', { name: /Внести текст в выбранные \\(2\\)/ }));

    fireEvent.change(screen.getByLabelText('Общий текст'), {
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
