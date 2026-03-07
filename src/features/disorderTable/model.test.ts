import { describe, expect, it } from 'vitest';
import {
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_COLUMN_GROUPS,
  DISORDER_TABLE_COURSE_IDS,
  DISORDER_TABLE_ROWS,
} from './config';
import {
  applySelectionModeToEntryInput,
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

  it('нормализует entry input и проверяет валидность', () => {
    const normalized = normalizeEntryInput({
      rowIds: [' memory ', 'memory'],
      columnIds: [' depression ', 'depression'],
      text: '  Моя заметка  ',
    });
    expect(normalized).toEqual({
      rowIds: ['memory'],
      columnIds: ['depression'],
      text: 'Моя заметка',
    });

    expect(
      isValidDisorderTableEntryInput({
        rowIds: ['memory'],
        columnIds: ['depression'],
        text: 'OK',
      })
    ).toBe(false);

    expect(
      isValidDisorderTableEntryInput({
        rowIds: ['memory'],
        columnIds: ['depression'],
        text: 'Текст валиден',
      })
    ).toBe(true);

    expect(
      isValidDisorderTableEntryInput({
        rowIds: ['memory', 'attention'],
        columnIds: ['depression', 'anxiety'],
        text: 'Текст валиден',
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
        },
        'one-row-many-columns'
      )
    ).toEqual({
      rowIds: ['memory'],
      columnIds: ['depression', 'anxiety'],
      text: 'Заметка',
    });

    expect(
      applySelectionModeToEntryInput(
        {
          rowIds: ['memory', 'attention'],
          columnIds: ['depression', 'anxiety'],
          text: 'Заметка',
        },
        'one-column-many-rows'
      )
    ).toEqual({
      rowIds: ['memory', 'attention'],
      columnIds: ['depression'],
      text: 'Заметка',
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
        columnIds: ['depression-bipolar'],
        text: 'entry 1',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
      {
        id: 'e2',
        rowIds: ['thinking'],
        columnIds: ['anxiety'],
        text: 'entry 2',
        createdAt: new Date('2026-03-08T10:00:00.000Z'),
        updatedAt: new Date('2026-03-08T10:00:00.000Z'),
      },
    ];

    expect(
      matchEntryByFilters(entries[0], {
        rowIds: [],
        columnIds: ['depression-bipolar'],
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
        columnIds: ['depression-bipolar'],
      }).map((entry) => entry.id)
    ).toEqual(['e1']);

    expect(
      applyDisorderTableFilters(entries, {
        rowIds: ['memory'],
        columnIds: ['anxiety'],
      })
    ).toEqual([]);
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
