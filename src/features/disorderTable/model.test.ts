import { describe, expect, it } from 'vitest';
import {
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_COLUMN_GROUPS,
  DISORDER_TABLE_COURSE_IDS,
  DISORDER_TABLE_ROWS,
} from './config';
import {
  applySelectionModeToEntryInput,
  buildBatchEntryInputsFromCells,
  buildDisorderTableFilters,
  buildDisorderTableCellKey,
  buildDisorderTableFullMatrix,
  buildDisorderTableMatrix,
  applyDisorderTableFilters,
  buildDisorderTableDocId,
  isDisorderTableCourse,
  isValidDisorderTableEntryInput,
  matchEntryByFilters,
  normalizeEntryInput,
  normalizeSelectionIds,
  resolveSelectionModeFromEntry,
} from './model';
import type { DisorderTableEntry } from './types';

describe('disorderTable model', () => {
  it('включает таблицу только для нужного курса', () => {
    expect(DISORDER_TABLE_COURSE_IDS).toEqual(['clinical']);
    expect(isDisorderTableCourse('clinical')).toBe(true);
    expect(isDisorderTableCourse('vvedenie-v-osnovy-klinicheskoy-psihologii')).toBe(false);
  });

  it('строит стабильный id документа', () => {
    expect(buildDisorderTableDocId('user-1', 'clinical')).toBe('user-1_clinical');
  });

  it('нормализует массив выбранных id', () => {
    expect(normalizeSelectionIds([' depression ', 'depression', '', ' memory '])).toEqual([
      'depression',
      'memory',
    ]);
  });

  it('собирает фильтры из staged выбора', () => {
    expect(buildDisorderTableFilters([' memory ', 'memory'], [' anxiety ', ''])).toEqual({
      rowIds: ['memory'],
      columnIds: ['anxiety'],
    });
  });

  it('нормализует entry input и проверяет валидность', () => {
    const normalized = normalizeEntryInput({
      rowIds: [' memory ', 'memory'],
      columnIds: [' depression ', 'depression'],
      text: '  Моя заметка  ',
      track: 'psychiatry',
    });
    expect(normalized).toEqual({
      rowIds: ['memory'],
      columnIds: ['depression'],
      text: 'Моя заметка',
      track: 'psychiatry',
    });

    expect(
      isValidDisorderTableEntryInput({
        rowIds: ['memory'],
        columnIds: ['depression'],
        text: 'OK',
        track: 'patopsychology',
      })
    ).toBe(false);

    expect(
      isValidDisorderTableEntryInput({
        rowIds: ['memory'],
        columnIds: ['depression'],
        text: 'Текст валиден',
        track: null,
      })
    ).toBe(true);

    expect(
      isValidDisorderTableEntryInput({
        rowIds: ['memory', 'attention'],
        columnIds: ['depression', 'anxiety'],
        text: 'Текст валиден',
        track: 'patopsychology',
      })
    ).toBe(false);
  });

  it('применяет режим выбора 1 + many', () => {
    expect(
      applySelectionModeToEntryInput(
        {
          rowIds: ['memory', 'attention'],
          columnIds: ['depression', 'anxiety'],
          text: '  Заметка  ',
          track: null,
        },
        'one-row-many-columns'
      )
    ).toEqual({
      rowIds: ['memory'],
      columnIds: ['depression', 'anxiety'],
      text: 'Заметка',
      track: null,
    });

    expect(
      applySelectionModeToEntryInput(
        {
          rowIds: ['memory', 'attention'],
          columnIds: ['depression', 'anxiety'],
          text: 'Заметка',
          track: 'psychiatry',
        },
        'one-column-many-rows'
      )
    ).toEqual({
      rowIds: ['memory', 'attention'],
      columnIds: ['depression'],
      text: 'Заметка',
      track: 'psychiatry',
    });
  });

  it('определяет режим выбора по записи', () => {
    expect(
      resolveSelectionModeFromEntry({
        rowIds: ['memory'],
        columnIds: ['depression', 'anxiety'],
      })
    ).toBe('one-row-many-columns');

    expect(
      resolveSelectionModeFromEntry({
        rowIds: ['memory', 'attention'],
        columnIds: ['depression'],
      })
    ).toBe('one-column-many-rows');
  });

  it('фильтрует записи по строкам и столбцам', () => {
    const entries: DisorderTableEntry[] = [
      {
        id: 'e1',
        rowIds: ['memory'],
        columnIds: ['depression'],
        text: 'entry 1',
        track: 'patopsychology',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
      {
        id: 'e2',
        rowIds: ['thinking'],
        columnIds: ['anxiety'],
        text: 'entry 2',
        track: 'psychiatry',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
    ];

    expect(
      matchEntryByFilters(entries[0], {
        rowIds: [],
        columnIds: ['depression'],
      })
    ).toBe(true);

    expect(
      applyDisorderTableFilters(entries, {
        rowIds: ['memory'],
        columnIds: [],
      }).map((entry) => entry.id)
    ).toEqual(['e1']);

    expect(
      applyDisorderTableFilters(entries, {
        rowIds: ['memory'],
        columnIds: ['depression'],
      }).map((entry) => entry.id)
    ).toEqual(['e1']);

    expect(
      applyDisorderTableFilters(entries, {
        rowIds: ['memory'],
        columnIds: ['anxiety'],
      })
    ).toEqual([]);
  });

  it('строит матрицу пересечений строк и столбцов', () => {
    const entries: DisorderTableEntry[] = [
      {
        id: 'e1',
        rowIds: ['memory'],
        columnIds: ['mania-bipolar', 'anxiety'],
        text: 'entry 1',
        track: 'patopsychology',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
      {
        id: 'e2',
        rowIds: ['memory', 'thinking'],
        columnIds: ['anxiety'],
        text: 'entry 2',
        track: 'psychiatry',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
    ];

    const matrix = buildDisorderTableMatrix(entries);

    expect(matrix.get(buildDisorderTableCellKey('memory', 'mania-bipolar'))?.map((entry) => entry.id)).toEqual(['e1']);
    expect(matrix.get(buildDisorderTableCellKey('memory', 'anxiety'))?.map((entry) => entry.id)).toEqual(['e1', 'e2']);
    expect(matrix.get(buildDisorderTableCellKey('thinking', 'anxiety'))?.map((entry) => entry.id)).toEqual(['e2']);
    expect(matrix.get(buildDisorderTableCellKey('thinking', 'mania-bipolar'))).toBeUndefined();
  });

  it('строит полную матрицу с пустыми пересечениями', () => {
    const entries: DisorderTableEntry[] = [
      {
        id: 'e1',
        rowIds: ['memory'],
        columnIds: ['anxiety'],
        text: 'entry 1',
        track: 'patopsychology',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
    ];

    const full = buildDisorderTableFullMatrix(['memory', 'thinking'], ['anxiety', 'depression'], entries);

    expect(full.get(buildDisorderTableCellKey('memory', 'anxiety'))?.length).toBe(1);
    expect(full.get(buildDisorderTableCellKey('thinking', 'anxiety'))).toEqual([]);
    expect(full.get(buildDisorderTableCellKey('memory', 'depression'))).toEqual([]);
  });

  it('преобразует множественное выделение ячеек в batch inputs', () => {
    const result = buildBatchEntryInputsFromCells(
      [
        { rowId: 'memory', columnId: 'anxiety' },
        { rowId: 'memory', columnId: 'anxiety' },
        { rowId: 'thinking', columnId: 'mania-bipolar' },
      ],
      '  Общий текст  '
    );

    expect(result).toEqual([
      {
        rowIds: ['memory'],
        columnIds: ['anxiety'],
        text: 'Общий текст',
        track: null,
      },
      {
        rowIds: ['thinking'],
        columnIds: ['mania-bipolar'],
        text: 'Общий текст',
        track: null,
      },
    ]);

    const psychiatryResult = buildBatchEntryInputsFromCells(
      [{ rowId: 'thinking', columnId: 'anxiety' }],
      'Текст',
      'psychiatry'
    );
    expect(psychiatryResult[0].track).toBe('psychiatry');
  });

  it('конфиг строк и столбцов содержит уникальные id и валидные группы', () => {
    const rowIds = DISORDER_TABLE_ROWS.map((row) => row.id);
    const columnIds = DISORDER_TABLE_COLUMNS.map((column) => column.id);
    const groupIds = new Set(DISORDER_TABLE_COLUMN_GROUPS.map((group) => group.id));

    expect(new Set(rowIds).size).toBe(rowIds.length);
    expect(new Set(columnIds).size).toBe(columnIds.length);
    expect(DISORDER_TABLE_COLUMNS.every((column) => groupIds.has(column.groupId))).toBe(true);
  });
});
