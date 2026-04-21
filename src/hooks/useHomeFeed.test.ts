import { describe, expect, it } from 'vitest';
import { normalizeAnnouncements, normalizeEvents } from './useHomeFeed';

describe('normalizeAnnouncements', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeAnnouncements(null)).toEqual([]);
    expect(normalizeAnnouncements(undefined)).toEqual([]);
    expect(normalizeAnnouncements({})).toEqual([]);
    expect(normalizeAnnouncements('string')).toEqual([]);
  });

  it('drops items without text', () => {
    const result = normalizeAnnouncements([
      { id: '1', text: '', createdAt: '2026-01-01' },
      { id: '2', text: '   ', createdAt: '2026-01-01' },
      { id: '3', createdAt: '2026-01-01' },
      { id: '4', text: 'valid', createdAt: '2026-01-01' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('preserves createdByName when present and omits otherwise', () => {
    const result = normalizeAnnouncements([
      { id: 'a', text: 'with author', createdAt: '2026-01-01', createdByName: 'Admin' },
      { id: 'b', text: 'no author', createdAt: '2026-01-01' },
    ]);
    expect(result[0].createdByName).toBe('Admin');
    expect(result[1].createdByName).toBeUndefined();
  });

  it('generates id when missing', () => {
    const result = normalizeAnnouncements([
      { text: 'without id', createdAt: '2026-01-01' },
    ]);
    expect(result[0].id).toBeTruthy();
    expect(typeof result[0].id).toBe('string');
  });

  it('trims whitespace from text', () => {
    const result = normalizeAnnouncements([
      { id: 'x', text: '  padded  ', createdAt: '2026-01-01' },
    ]);
    expect(result[0].text).toBe('padded');
  });

  it('caps result at 30 items', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: `a-${i}`,
      text: `announcement ${i}`,
      createdAt: '2026-01-01',
    }));
    expect(normalizeAnnouncements(many)).toHaveLength(30);
  });

  it('ignores non-object items', () => {
    const result = normalizeAnnouncements([null, undefined, 'string', 42, { text: 'ok' }]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('ok');
  });
});

describe('normalizeEvents', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeEvents(null)).toEqual([]);
    expect(normalizeEvents({})).toEqual([]);
  });

  it('drops items without dateLabel or text', () => {
    const result = normalizeEvents([
      { id: '1', text: 'no date', createdAt: '2026-01-01' },
      { id: '2', dateLabel: '1 мая', createdAt: '2026-01-01' },
      { id: '3', dateLabel: '1 мая', text: 'valid', createdAt: '2026-01-01' },
      { id: '4', dateLabel: '  ', text: 'empty date', createdAt: '2026-01-01' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('trims dateLabel and text', () => {
    const result = normalizeEvents([
      { id: 'x', dateLabel: '  7 мая  ', text: '  Хэллоуин  ', createdAt: '2026-01-01' },
    ]);
    expect(result[0].dateLabel).toBe('7 мая');
    expect(result[0].text).toBe('Хэллоуин');
  });

  it('caps result at 40 items', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `e-${i}`,
      dateLabel: `${i} мая`,
      text: `event ${i}`,
      createdAt: '2026-01-01',
    }));
    expect(normalizeEvents(many)).toHaveLength(40);
  });
});
