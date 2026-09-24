import { describe, it, expect } from 'vitest';
import {
  formatTimeFromSeconds,
  toDateKey,
  toDateKeyInTimeZone,
  parseDateKey,
  formatDateKey,
  tryParseDateLabel,
  resolveContinueCourses,
  resolvePurchasedCourseIds,
  sortCoursesOldestFirst,
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

describe('toDateKeyInTimeZone', () => {
  it('даёт формат YYYY-MM-DD в заданной таймзоне', () => {
    // 22:30 UTC = 01:30 следующего дня в Москве (+3)
    const instant = new Date('2026-08-28T22:30:00Z');
    expect(toDateKeyInTimeZone(instant, 'Europe/Moscow')).toBe('2026-08-29');
    expect(toDateKeyInTimeZone(instant, 'UTC')).toBe('2026-08-28');
  });

  it('около полуночи день зависит от таймзоны', () => {
    const instant = new Date('2025-12-09T02:00:00+03:00'); // 09.12 в Москве
    expect(toDateKeyInTimeZone(instant, 'Europe/Moscow')).toBe('2025-12-09');
    expect(toDateKeyInTimeZone(instant, 'America/New_York')).toBe('2025-12-08');
  });
});

describe('parseDateKey', () => {
  it('parses YYYY-MM-DD into local Date', () => {
    const date = parseDateKey('2026-08-28');
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(7); // August = 7
    expect(date!.getDate()).toBe(28);
  });

  it('round-trips with toDateKey', () => {
    expect(toDateKey(parseDateKey('2025-12-09')!)).toBe('2025-12-09');
  });

  it('returns null for invalid input', () => {
    expect(parseDateKey('invalid')).toBeNull();
    expect(parseDateKey('')).toBeNull();
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
  const base = {
    userFeaturedCourseIds: [] as string[],
    userUnfeaturedCourseIds: [] as string[],
    groups: [],
    recentlyWatchedCourseIds: [] as string[],
    accessibleCourseIds: allAccessible,
  };

  it('актуальные потока без лимита, из нескольких потоков с дедупом', () => {
    const result = resolveContinueCourses({
      ...base,
      groups: [
        { id: 'g1', featuredCourseIds: ['A', 'B'] },
        { id: 'g2', featuredCourseIds: ['B', 'C', 'D'] },
      ],
    });
    expect(result).toEqual({ ids: ['A', 'B', 'C', 'D'], streamIds: ['A', 'B', 'C', 'D'], isFallback: false });
  });

  it('актуальные потока + купленные + добавленные студентом', () => {
    const result = resolveContinueCourses({
      ...base,
      userFeaturedCourseIds: ['Y'],
      groups: [{ id: 'g1', featuredCourseIds: ['A'] }],
      personalCourseIds: ['X'],
    });
    expect(result).toEqual({ ids: ['A', 'X', 'Y'], streamIds: ['A'], isFallback: false });
  });

  it('студент убирает курс потока и купленный', () => {
    const result = resolveContinueCourses({
      ...base,
      userUnfeaturedCourseIds: ['A', 'X'],
      groups: [{ id: 'g1', featuredCourseIds: ['A', 'B'] }],
      personalCourseIds: ['X', 'Y'],
    });
    expect(result).toEqual({ ids: ['B', 'Y'], streamIds: ['B'], isFallback: false });
  });

  it('убранный, но добавленный заново курс показывается', () => {
    const result = resolveContinueCourses({
      ...base,
      userFeaturedCourseIds: ['A'],
      userUnfeaturedCourseIds: ['A'],
      groups: [{ id: 'g1', featuredCourseIds: ['A'] }],
    });
    expect(result.ids).toEqual(['A']);
  });

  it('системная «Все» и isSystem-группы не участвуют', () => {
    const result = resolveContinueCourses({
      ...base,
      groups: [
        { id: 'everyone', featuredCourseIds: ['A', 'B'] },
        { id: 'sys', isSystem: true, featuredCourseIds: ['C'] },
        { id: 'g1', featuredCourseIds: ['X'] },
      ],
    });
    expect(result.ids).toEqual(['X']);
  });

  it('недоступные курсы отфильтровываются', () => {
    const result = resolveContinueCourses({
      ...base,
      userFeaturedCourseIds: ['NO_ACCESS', 'Y'],
      groups: [{ id: 'g1', featuredCourseIds: ['NO_1', 'A'] }],
      personalCourseIds: ['NO_2'],
    });
    expect(result).toEqual({ ids: ['A', 'Y'], streamIds: ['A'], isFallback: false });
  });

  it('пусто → последний просмотренный из доступных', () => {
    const result = resolveContinueCourses({
      ...base,
      recentlyWatchedCourseIds: ['NO_ACCESS', 'C', 'A'],
    });
    expect(result).toEqual({ ids: ['C'], streamIds: [], isFallback: true });
  });

  it('всё убрано → запасной курс', () => {
    const result = resolveContinueCourses({
      ...base,
      userUnfeaturedCourseIds: ['A'],
      groups: [{ id: 'g1', featuredCourseIds: ['A'] }],
      recentlyWatchedCourseIds: ['B'],
    });
    expect(result).toEqual({ ids: ['B'], streamIds: [], isFallback: true });
  });

  it('ничего не смотрел → самый старый доступный (первый в accessibleCourseIds)', () => {
    const result = resolveContinueCourses({
      ...base,
      accessibleCourseIds: ['D', 'A'],
      recentlyWatchedCourseIds: ['NO_ACCESS'],
    });
    expect(result).toEqual({ ids: ['D'], streamIds: [], isFallback: true });
  });

  it('нет доступных курсов → пусто', () => {
    const result = resolveContinueCourses({ ...base, accessibleCourseIds: [] });
    expect(result).toEqual({ ids: [], streamIds: [], isFallback: true });
  });

  it('игнорирует группы с пустым/отсутствующим featuredCourseIds', () => {
    const result = resolveContinueCourses({
      ...base,
      groups: [{ featuredCourseIds: [] }, {}, { featuredCourseIds: ['A'] }],
    });
    expect(result.ids).toEqual(['A']);
  });
});

describe('sortCoursesOldestFirst', () => {
  it('базовые (без даты) — первыми в исходном порядке, дальше по дате создания', () => {
    const sorted = sortCoursesOldestFirst([
      { id: 'new', createdAtMs: 300 },
      { id: 'development' },
      { id: 'old', createdAtMs: 100 },
      { id: 'clinical' },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['development', 'clinical', 'old', 'new']);
  });
});

describe('resolvePurchasedCourseIds', () => {
  it('личный доступ и обычный поток — «Приобретён»', () => {
    const result = resolvePurchasedCourseIds({
      courseAccess: { clinical: true, general: false },
      groups: [{ id: 'g1', grantedCourses: ['development'] }],
      openCourseIds: new Set(),
    });
    expect([...result].sort()).toEqual(['clinical', 'development']);
  });

  it('открытые всем курсы (публичные видео или группа «Все») не помечаются', () => {
    const result = resolvePurchasedCourseIds({
      courseAccess: { clinical: true, 'open-course': true },
      groups: [
        { id: 'everyone', grantedCourses: ['free-course'] },
        { id: 'g1', grantedCourses: ['free-course', 'development'] },
      ],
      openCourseIds: new Set(['open-course']),
    });
    expect([...result].sort()).toEqual(['clinical', 'development']);
  });

  it('без доступа — пусто', () => {
    const result = resolvePurchasedCourseIds({
      courseAccess: null,
      groups: [],
      openCourseIds: new Set(['x']),
    });
    expect(result.size).toBe(0);
  });
});
