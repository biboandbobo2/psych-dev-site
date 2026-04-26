import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeekGrid,
  eventDurationDays,
  formatMonthYearRu,
  formatWeekRangeRu,
  groupItemsByDate,
  startOfWeek,
} from '../calendarGrid';

describe('buildMonthGrid', () => {
  it('возвращает 42 дня (6 недель)', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 1)); // май 2026
    expect(grid).toHaveLength(42);
  });

  it('начинается с понедельника, заканчивается воскресеньем', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 1));
    expect(grid[0].dayOfWeek).toBe(1); // понедельник
    expect(grid[41].dayOfWeek).toBe(0); // воскресенье
  });

  it('помечает дни текущего месяца', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 15)); // май
    const inside = grid.filter((d) => d.isCurrentMonth);
    expect(inside).toHaveLength(31); // в мае 31 день
    expect(inside[0].dayOfMonth).toBe(1);
    expect(inside[30].dayOfMonth).toBe(31);
  });

  it('помечает «сегодня»', () => {
    const today = new Date(2026, 4, 15);
    const grid = buildMonthGrid(new Date(2026, 4, 1), today);
    const todayCell = grid.find((d) => d.isToday);
    expect(todayCell).toBeDefined();
    expect(todayCell?.dayOfMonth).toBe(15);
  });

  it('генерирует уникальные iso-даты для всех 42 ячеек', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 1));
    const isoSet = new Set(grid.map((d) => d.isoDate));
    expect(isoSet.size).toBe(42);
  });

  it('покрывает февраль с правильным количеством дней-внутри', () => {
    // февраль 2026 — обычный год, 28 дней
    const grid = buildMonthGrid(new Date(2026, 1, 10));
    const inside = grid.filter((d) => d.isCurrentMonth);
    expect(inside).toHaveLength(28);
  });
});

describe('groupItemsByDate', () => {
  it('группирует элементы по iso-дате, извлекаемой из поля', () => {
    const items = [
      { id: 'a', when: new Date(2026, 4, 15, 9, 0) },
      { id: 'b', when: new Date(2026, 4, 15, 18, 30) },
      { id: 'c', when: new Date(2026, 4, 16, 10, 0) },
    ];
    const grouped = groupItemsByDate(items, (i) => i.when);
    expect(grouped.get('2026-05-15')?.map((i) => i.id)).toEqual(['a', 'b']);
    expect(grouped.get('2026-05-16')?.map((i) => i.id)).toEqual(['c']);
    expect(grouped.size).toBe(2);
  });

  it('пропускает элементы, у которых getDate возвращает null/undefined', () => {
    const items = [
      { id: 'a', when: new Date(2026, 4, 15) },
      { id: 'b', when: null },
      { id: 'c', when: undefined },
    ];
    const grouped = groupItemsByDate(items, (i) => i.when as Date | null | undefined);
    expect(grouped.size).toBe(1);
    expect(grouped.get('2026-05-15')?.map((i) => i.id)).toEqual(['a']);
  });
});

describe('addMonths', () => {
  it('сдвигает на положительное число месяцев', () => {
    const next = addMonths(new Date(2026, 4, 15), 1);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(1);
  });

  it('сдвигает на отрицательное число месяцев', () => {
    const prev = addMonths(new Date(2026, 0, 15), -1);
    expect(prev.getFullYear()).toBe(2025);
    expect(prev.getMonth()).toBe(11);
  });
});

describe('eventDurationDays', () => {
  it('возвращает 1 для одно-дневного события', () => {
    const start = Date.UTC(2026, 4, 15, 9, 0);
    const end = Date.UTC(2026, 4, 15, 11, 0);
    expect(eventDurationDays(start, end)).toBe(1);
  });

  it('возвращает 5 для 22-26 июля (4 полных дня + endpoint)', () => {
    const start = Date.UTC(2026, 6, 22, 0, 0);
    const end = Date.UTC(2026, 6, 26, 0, 0);
    expect(eventDurationDays(start, end)).toBe(4);
  });

  it('защищает от end <= start', () => {
    const start = Date.UTC(2026, 4, 15, 10, 0);
    expect(eventDurationDays(start, start)).toBe(1);
    expect(eventDurationDays(start + 1000, start)).toBe(1);
  });
});

describe('formatMonthYearRu', () => {
  it('форматирует с заглавной буквы', () => {
    const out = formatMonthYearRu(new Date(2026, 4, 15));
    expect(out).toMatch(/^Май/);
    expect(out).toContain('2026');
  });
});

describe('addDays / startOfWeek / buildWeekGrid', () => {
  it('addDays сдвигает на N дней', () => {
    const out = addDays(new Date(2026, 4, 15), 3);
    expect(out.getDate()).toBe(18);
    expect(out.getMonth()).toBe(4);
  });

  it('startOfWeek возвращает понедельник для среды', () => {
    // 13 мая 2026 — среда
    const monday = startOfWeek(new Date(2026, 4, 13));
    expect(monday.getDate()).toBe(11); // понедельник 11.05
    expect(monday.getDay()).toBe(1);
  });

  it('startOfWeek для воскресенья возвращает понедельник той же недели (за 6 дней до)', () => {
    // 17 мая 2026 — воскресенье
    const monday = startOfWeek(new Date(2026, 4, 17));
    expect(monday.getDate()).toBe(11);
  });

  it('buildWeekGrid возвращает 7 дней пн-вс', () => {
    const grid = buildWeekGrid(new Date(2026, 4, 13));
    expect(grid).toHaveLength(7);
    expect(grid[0].dayOfWeek).toBe(1); // понедельник
    expect(grid[6].dayOfWeek).toBe(0); // воскресенье
    expect(grid[0].dayOfMonth).toBe(11);
    expect(grid[6].dayOfMonth).toBe(17);
  });

  it('buildWeekGrid помечает today', () => {
    const today = new Date(2026, 4, 13);
    const grid = buildWeekGrid(new Date(2026, 4, 15), today);
    const todayCell = grid.find((d) => d.isToday);
    expect(todayCell?.dayOfMonth).toBe(13);
  });
});

describe('formatWeekRangeRu', () => {
  it('возвращает диапазон вида «11 – 17 мая 2026»', () => {
    const out = formatWeekRangeRu(new Date(2026, 4, 13));
    expect(out).toContain('11');
    expect(out).toContain('17');
    expect(out).toMatch(/мая|май/i);
    expect(out).toContain('2026');
  });
});
