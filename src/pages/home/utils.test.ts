import { describe, expect, it } from 'vitest';
import { formatDueDateRu, getCourseIntroPath, selectUpcomingAssignments } from './utils';

describe('getCourseIntroPath', () => {
  it('core курсы маппятся на короткие пути', () => {
    expect(getCourseIntroPath('development')).toBe('/development/intro');
    expect(getCourseIntroPath('clinical')).toBe('/clinical/intro');
    expect(getCourseIntroPath('general')).toBe('/general/intro');
  });

  it('non-core курс получает /course/:id/intro c URL-encoded id', () => {
    expect(getCourseIntroPath('warm-springs')).toBe('/course/warm-springs/intro');
    expect(getCourseIntroPath('a/b')).toBe('/course/a%2Fb/intro');
    expect(getCourseIntroPath('Курс')).toBe('/course/%D0%9A%D1%83%D1%80%D1%81/intro');
  });
});

describe('formatDueDateRu', () => {
  it('форматирует YYYY-MM-DD как DD.MM', () => {
    expect(formatDueDateRu('2026-04-27')).toBe('27.04');
    expect(formatDueDateRu('2025-01-01')).toBe('01.01');
  });

  it('возвращает пустую строку для null/undefined/пусто', () => {
    expect(formatDueDateRu(null)).toBe('');
    expect(formatDueDateRu(undefined)).toBe('');
    expect(formatDueDateRu('')).toBe('');
  });

  it('возвращает as-is если формат не совпадает', () => {
    expect(formatDueDateRu('27 апреля')).toBe('27 апреля');
    expect(formatDueDateRu('2026/04/27')).toBe('2026/04/27');
  });
});

describe('selectUpcomingAssignments', () => {
  const item = (id: string, kind: string, dueDate: string | null) => ({ id, kind, dueDate });
  const TODAY = '2026-08-28';

  it('сортирует по возрастанию дедлайна, а не по порядку ленты', () => {
    const result = selectUpcomingAssignments(
      [
        item('later', 'assignment', '2026-12-01'),
        item('soon', 'assignment', '2026-08-30'),
        item('mid', 'assignment', '2026-09-15'),
      ],
      TODAY,
    );
    expect(result.map((x) => x.id)).toEqual(['soon', 'mid', 'later']);
  });

  it('скрывает просроченные, но оставляет сегодняшний дедлайн', () => {
    const result = selectUpcomingAssignments(
      [
        item('expired', 'assignment', '2026-08-27'),
        item('today', 'assignment', TODAY),
        item('future', 'assignment', '2026-09-01'),
      ],
      TODAY,
    );
    expect(result.map((x) => x.id)).toEqual(['today', 'future']);
  });

  it('отбрасывает не-assignment и записи без dueDate', () => {
    const result = selectUpcomingAssignments(
      [
        item('event', 'event', null),
        item('announcement', 'announcement', null),
        item('broken', 'assignment', null),
        item('ok', 'assignment', '2026-09-01'),
      ],
      TODAY,
    );
    expect(result.map((x) => x.id)).toEqual(['ok']);
  });
});
