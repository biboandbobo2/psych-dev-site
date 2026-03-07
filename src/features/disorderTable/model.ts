import { DISORDER_TABLE_COURSE_IDS } from './config';
import type { DisorderTableEntry, DisorderTableEntryInput, DisorderTableFilters } from './types';

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
  };
}

export function isValidDisorderTableEntryInput(input: DisorderTableEntryInput): boolean {
  const normalized = normalizeEntryInput(input);
  return normalized.rowIds.length > 0 && normalized.columnIds.length > 0 && normalized.text.length >= 3;
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
