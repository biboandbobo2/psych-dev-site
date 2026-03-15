import { DISORDER_TABLE_COURSE_IDS } from './config';
import type {
  DisorderTableCellSelection,
  DisorderTableEntry,
  DisorderTableEntryInput,
  DisorderTableEntryTrack,
  DisorderTableFilters,
} from './types';

export type DisorderTableSelectionMode = 'one-row-many-columns' | 'one-column-many-rows';

export function isDisorderTableCourse(courseId: string): boolean {
  return DISORDER_TABLE_COURSE_IDS.includes(courseId as (typeof DISORDER_TABLE_COURSE_IDS)[number]);
}

export function buildDisorderTableDocId(userId: string, courseId: string): string {
  return `${userId}_${courseId}`;
}

export function normalizeSelectionIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

export function normalizeEntryInput(input: DisorderTableEntryInput): DisorderTableEntryInput {
  return {
    rowIds: normalizeSelectionIds(input.rowIds),
    columnIds: normalizeSelectionIds(input.columnIds),
    text: input.text.trim(),
    track: normalizeEntryTrack(input.track),
  };
}

export function normalizeEntryTrack(track?: DisorderTableEntryTrack | null): DisorderTableEntryTrack | null {
  if (track === 'patopsychology' || track === 'psychiatry') return track;
  return null;
}

export function buildDisorderTableFilters(rowIds: string[], columnIds: string[]): DisorderTableFilters {
  return {
    rowIds: normalizeSelectionIds(rowIds),
    columnIds: normalizeSelectionIds(columnIds),
  };
}

export function applySelectionModeToEntryInput(
  input: DisorderTableEntryInput,
  mode: DisorderTableSelectionMode
): DisorderTableEntryInput {
  const normalized = normalizeEntryInput(input);

  if (mode === 'one-row-many-columns') {
    return {
      rowIds: normalized.rowIds.slice(0, 1),
      columnIds: normalized.columnIds,
      text: normalized.text,
      track: normalized.track,
    };
  }

  return {
    rowIds: normalized.rowIds,
    columnIds: normalized.columnIds.slice(0, 1),
    text: normalized.text,
    track: normalized.track,
  };
}

export function resolveSelectionModeFromEntry(input: Pick<DisorderTableEntryInput, 'rowIds' | 'columnIds'>): DisorderTableSelectionMode {
  if (input.rowIds.length === 1 && input.columnIds.length !== 1) {
    return 'one-row-many-columns';
  }
  if (input.columnIds.length === 1 && input.rowIds.length !== 1) {
    return 'one-column-many-rows';
  }
  if (input.rowIds.length === 1) {
    return 'one-row-many-columns';
  }
  if (input.columnIds.length === 1) {
    return 'one-column-many-rows';
  }
  return 'one-row-many-columns';
}

export function isValidDisorderTableEntryInput(input: DisorderTableEntryInput): boolean {
  const normalized = normalizeEntryInput(input);
  const hasSingleAxisSelection =
    (normalized.rowIds.length === 1 && normalized.columnIds.length >= 1) ||
    (normalized.columnIds.length === 1 && normalized.rowIds.length >= 1);

  return hasSingleAxisSelection && normalized.text.length >= 3;
}

export function matchEntryByFilters(entry: DisorderTableEntry, filters: DisorderTableFilters): boolean {
  const hasRowFilters = filters.rowIds.length > 0;
  const hasColumnFilters = filters.columnIds.length > 0;

  const rowMatch = !hasRowFilters || filters.rowIds.some((rowId) => entry.rowIds.includes(rowId));
  const columnMatch = !hasColumnFilters || filters.columnIds.some((columnId) => entry.columnIds.includes(columnId));

  return rowMatch && columnMatch;
}

export function applyDisorderTableFilters(
  entries: DisorderTableEntry[],
  filters: DisorderTableFilters
): DisorderTableEntry[] {
  return entries.filter((entry) => matchEntryByFilters(entry, filters));
}

export function buildDisorderTableCellKey(rowId: string, columnId: string): string {
  return `${rowId}::${columnId}`;
}

export function buildDisorderTableMatrix(entries: DisorderTableEntry[]): Map<string, DisorderTableEntry[]> {
  const matrix = new Map<string, DisorderTableEntry[]>();

  for (const entry of entries) {
    for (const rowId of entry.rowIds) {
      for (const columnId of entry.columnIds) {
        const key = buildDisorderTableCellKey(rowId, columnId);
        const bucket = matrix.get(key);
        if (bucket) {
          bucket.push(entry);
        } else {
          matrix.set(key, [entry]);
        }
      }
    }
  }

  return matrix;
}

export function buildDisorderTableFullMatrix(
  rowIds: string[],
  columnIds: string[],
  entries: DisorderTableEntry[]
): Map<string, DisorderTableEntry[]> {
  const matrix = new Map<string, DisorderTableEntry[]>();

  for (const rowId of rowIds) {
    for (const columnId of columnIds) {
      matrix.set(buildDisorderTableCellKey(rowId, columnId), []);
    }
  }

  for (const entry of entries) {
    for (const rowId of entry.rowIds) {
      for (const columnId of entry.columnIds) {
        const key = buildDisorderTableCellKey(rowId, columnId);
        const bucket = matrix.get(key);
        if (bucket) {
          bucket.push(entry);
        }
      }
    }
  }

  return matrix;
}

export function buildBatchEntryInputsFromCells(
  cells: DisorderTableCellSelection[],
  text: string,
  track?: DisorderTableEntryTrack | null
): DisorderTableEntryInput[] {
  const normalizedText = text.trim();
  const normalizedTrack = normalizeEntryTrack(track);
  const uniqueCells = new Map<string, DisorderTableCellSelection>();

  for (const cell of cells) {
    uniqueCells.set(buildDisorderTableCellKey(cell.rowId, cell.columnId), cell);
  }

  return Array.from(uniqueCells.values()).map((cell) => ({
    rowIds: [cell.rowId],
    columnIds: [cell.columnId],
    text: normalizedText,
    track: normalizedTrack,
  }));
}
