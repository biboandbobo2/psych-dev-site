import { describe, it, expect } from 'vitest';
import { normalizeGroupDoc } from './useMyGroups';

describe('normalizeGroupDoc', () => {
  it('normalizes valid group data', () => {
    const result = normalizeGroupDoc('g1', {
      name: 'Группа 1',
      memberIds: ['u1', 'u2'],
      grantedCourses: ['development'],
      announcementAdminIds: ['u1'],
      description: 'Описание',
    });
    expect(result).toEqual({
      id: 'g1',
      name: 'Группа 1',
      description: 'Описание',
      memberIds: ['u1', 'u2'],
      grantedCourses: ['development'],
      announcementAdminIds: ['u1'],
    });
  });

  it('прокидывает gcalId — редактор группы отправляет его обратно как есть', () => {
    // Без этого поля редактор слал пустую строку, и updateGroup отвязывал
    // календарь при любом сохранении группы (2026-09-17, обе группы потоков).
    const withCalendar = normalizeGroupDoc('g1', {
      name: 'Поток',
      gcalId: 'abc@group.calendar.google.com',
    });
    expect(withCalendar?.gcalId).toBe('abc@group.calendar.google.com');
    expect(normalizeGroupDoc('g2', { name: 'Без календаря' })?.gcalId).toBeUndefined();
  });

  it('returns null for null/undefined/non-object', () => {
    expect(normalizeGroupDoc('g1', null)).toBeNull();
    expect(normalizeGroupDoc('g1', undefined)).toBeNull();
    expect(normalizeGroupDoc('g1', 'string')).toBeNull();
    expect(normalizeGroupDoc('g1', 42)).toBeNull();
  });

  it('returns null for empty name', () => {
    expect(normalizeGroupDoc('g1', { name: '' })).toBeNull();
    expect(normalizeGroupDoc('g1', { name: '   ' })).toBeNull();
  });

  it('returns null for missing name', () => {
    expect(normalizeGroupDoc('g1', { memberIds: ['u1'] })).toBeNull();
  });

  it('returns null for non-string name', () => {
    expect(normalizeGroupDoc('g1', { name: 123 })).toBeNull();
  });

  it('defaults arrays to empty when missing', () => {
    const result = normalizeGroupDoc('g1', { name: 'Test' });
    expect(result?.memberIds).toEqual([]);
    expect(result?.grantedCourses).toEqual([]);
    expect(result?.announcementAdminIds).toEqual([]);
  });

  it('filters non-string items from arrays', () => {
    const result = normalizeGroupDoc('g1', {
      name: 'Test',
      memberIds: ['u1', 42, null, 'u2'],
      grantedCourses: [true, 'development'],
      announcementAdminIds: [undefined, 'u1'],
    });
    expect(result?.memberIds).toEqual(['u1', 'u2']);
    expect(result?.grantedCourses).toEqual(['development']);
    expect(result?.announcementAdminIds).toEqual(['u1']);
  });

  it('handles non-array memberIds gracefully', () => {
    const result = normalizeGroupDoc('g1', { name: 'Test', memberIds: 'not-array' });
    expect(result?.memberIds).toEqual([]);
  });

  it('trims name', () => {
    const result = normalizeGroupDoc('g1', { name: '  Trimmed  ' });
    expect(result?.name).toBe('Trimmed');
  });

  it('omits description when not a string', () => {
    const result = normalizeGroupDoc('g1', { name: 'Test', description: 123 });
    expect(result?.description).toBeUndefined();
  });
});
