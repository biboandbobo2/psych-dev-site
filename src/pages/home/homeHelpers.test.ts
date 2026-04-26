import { describe, it, expect } from 'vitest';
import {
  formatTimeFromSeconds,
  toDateKey,
  formatDateKey,
  tryParseDateLabel,
  resolveContinueCourses,
} from './homeHelpers';

describe('formatTimeFromSeconds', () => {
  it('formats seconds only', () => {
    expect(formatTimeFromSeconds(5)).toBe('0:05');
    expect(formatTimeFromSeconds(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimeFromSeconds(60)).toBe('1:00');
    expect(formatTimeFromSeconds(125)).toBe('2:05');
    expect(formatTimeFromSeconds(599)).toBe('9:59');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTimeFromSeconds(3600)).toBe('1:00:00');
    expect(formatTimeFromSeconds(3661)).toBe('1:01:01');
    expect(formatTimeFromSeconds(7384)).toBe('2:03:04');
  });

  it('handles zero', () => {
    expect(formatTimeFromSeconds(0)).toBe('0:00');
  });

  it('handles negative values as zero', () => {
    expect(formatTimeFromSeconds(-10)).toBe('0:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatTimeFromSeconds(61.9)).toBe('1:01');
  });
});

describe('toDateKey', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('zero-pads month and day', () => {
    expect(toDateKey(new Date(2026, 2, 3))).toBe('2026-03-03');
  });
});

describe('formatDateKey', () => {
  it('formats YYYY-MM-DD into Russian locale date', () => {
    const result = formatDateKey('2026-04-24');
    expect(result).toMatch(/24/);
    expect(result).toMatch(/2026/);
  });

  it('returns raw key for invalid input', () => {
    expect(formatDateKey('invalid')).toBe('invalid');
    expect(formatDateKey('')).toBe('');
  });
});

describe('tryParseDateLabel', () => {
  it('parses ISO format YYYY-MM-DD', () => {
    const date = tryParseDateLabel('2026-04-24');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(3); // April = 3
    expect(date!.getDate()).toBe(24);
  });

  it('parses DD.MM.YYYY format', () => {
    const date = tryParseDateLabel('24.04.2026');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(3);
    expect(date!.getDate()).toBe(24);
  });

  it('parses DD/MM/YYYY format', () => {
    const date = tryParseDateLabel('5/1/2026');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getDate()).toBe(5);
    expect(date!.getMonth()).toBe(0);
  });

  it('parses Russian "DD месяц YYYY"', () => {
    const date = tryParseDateLabel('15 января 2026');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(0);
    expect(date!.getDate()).toBe(15);
  });

  it('parses Russian "DD мая YYYY"', () => {
    const date = tryParseDateLabel('3 мая 2026');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getMonth()).toBe(4);
    expect(date!.getDate()).toBe(3);
  });

  it('parses Russian month names: все месяцы', () => {
    const months = [
      ['январь', 0], ['февраль', 1], ['март', 2], ['апрель', 3],
      ['май', 4], ['июнь', 5], ['июль', 6], ['август', 7],
      ['сентябрь', 8], ['октябрь', 9], ['ноябрь', 10], ['декабрь', 11],
    ] as const;
    for (const [name, idx] of months) {
      const date = tryParseDateLabel(`1 ${name} 2026`);
      expect(date, `${name} should parse`).toBeInstanceOf(Date);
      expect(date!.getMonth(), `${name} month index`).toBe(idx);
    }
  });

  it('parses "месяц YYYY" without day (defaults to 1st)', () => {
    const date = tryParseDateLabel('апрель 2026');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(3);
    expect(date!.getDate()).toBe(1);
  });

  it('returns null for empty/whitespace', () => {
    expect(tryParseDateLabel('')).toBeNull();
    expect(tryParseDateLabel('   ')).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(tryParseDateLabel('not a date at all')).toBeNull();
  });

  it('trims input', () => {
    const date = tryParseDateLabel('  2026-01-01  ');
    expect(date).toBeInstanceOf(Date);
  });
});

describe('resolveContinueCourses', () => {
  const allAccessible = ['A', 'B', 'C', 'D', 'X', 'Y'];

  it('возвращает empty при пустых настройках и без просмотров', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: [], source: 'empty' });
  });

  it('возвращает группу [A,B,C], если у пользователя пусто', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [{ featuredCourseIds: ['A', 'B', 'C'] }],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['A', 'B', 'C'], source: 'group' });
  });

  it('user-featured имеет приоритет над group', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: ['X', 'Y'],
      groups: [{ featuredCourseIds: ['A', 'B', 'C'] }],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['X', 'Y'], source: 'user' });
  });

  it('lastWatched используется только если featured пусты', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [],
      lastWatchedCourseId: 'A',
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['A'], source: 'lastWatched' });
  });

  it('lastWatched игнорируется, если курс недоступен', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [],
      lastWatchedCourseId: 'Z',
      accessibleCourseIds: ['A'],
    });
    expect(result).toEqual({ ids: [], source: 'empty' });
  });

  it('user-featured фильтруется по accessibleCourseIds', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: ['X', 'NO_ACCESS', 'Y'],
      groups: [],
      lastWatchedCourseId: null,
      accessibleCourseIds: ['X', 'Y'],
    });
    expect(result).toEqual({ ids: ['X', 'Y'], source: 'user' });
  });

  it('если user-featured содержит только недоступные — fallback на group', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: ['NO_1', 'NO_2'],
      groups: [{ featuredCourseIds: ['A'] }],
      lastWatchedCourseId: null,
      accessibleCourseIds: ['A'],
    });
    expect(result).toEqual({ ids: ['A'], source: 'group' });
  });

  it('объединяет featured из нескольких групп с дедупом и обрезкой до 3', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [
        { featuredCourseIds: ['A', 'B'] },
        { featuredCourseIds: ['B', 'C', 'D'] },
      ],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['A', 'B', 'C'], source: 'group' });
  });

  it('сохраняет порядок групп (приоритет более ранней)', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [
        { featuredCourseIds: ['C'] },
        { featuredCourseIds: ['A', 'B'] },
      ],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['C', 'A', 'B'], source: 'group' });
  });

  it('обрезает user-featured до 3', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: ['A', 'B', 'C', 'D'],
      groups: [],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['A', 'B', 'C'], source: 'user' });
  });

  it('игнорирует группы с пустым/отсутствующим featuredCourseIds', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [{ featuredCourseIds: [] }, {}, { featuredCourseIds: ['A'] }],
      lastWatchedCourseId: null,
      accessibleCourseIds: allAccessible,
    });
    expect(result).toEqual({ ids: ['A'], source: 'group' });
  });

  it('group игнорируется, если все его курсы недоступны', () => {
    const result = resolveContinueCourses({
      userFeaturedCourseIds: [],
      groups: [{ featuredCourseIds: ['NO_1', 'NO_2'] }],
      lastWatchedCourseId: 'A',
      accessibleCourseIds: ['A'],
    });
    expect(result).toEqual({ ids: ['A'], source: 'lastWatched' });
  });
});
