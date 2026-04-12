import { describe, expect, it } from 'vitest';
import { padTime, slotOverlapsBusy } from '../../src/pages/booking/useBookingApi';
import type { BusyInterval } from '../../src/pages/booking/useBookingApi';

describe('padTime', () => {
  it('добавляет ведущий ноль к однозначному часу', () => {
    expect(padTime('9:30')).toBe('09:30');
  });

  it('не меняет двузначный час', () => {
    expect(padTime('14:00')).toBe('14:00');
  });

  it('корректно обрабатывает полночь', () => {
    expect(padTime('0:00')).toBe('00:00');
  });
});

describe('slotOverlapsBusy', () => {
  const date = '2026-04-15';

  const busy: BusyInterval[] = [
    { start: '2026-04-15T14:00:00+04:00', lengthSeconds: 3600 }, // 14:00-15:00
    { start: '2026-04-15T18:00:00+04:00', lengthSeconds: 7200 }, // 18:00-20:00
  ];

  it('не перекрывает — слот до занятого блока', () => {
    // 12:00-13:00 vs 14:00-15:00
    expect(slotOverlapsBusy('12:00', 3600, date, busy)).toBe(false);
  });

  it('не перекрывает — слот после занятого блока', () => {
    // 15:00-16:00 vs 14:00-15:00
    expect(slotOverlapsBusy('15:00', 3600, date, busy)).toBe(false);
  });

  it('не перекрывает — слот между двумя блоками', () => {
    // 16:00-17:00 — свободно между 14-15 и 18-20
    expect(slotOverlapsBusy('16:00', 3600, date, busy)).toBe(false);
  });

  it('перекрывает — слот начинается внутри busy', () => {
    // 14:30-15:30 vs 14:00-15:00
    expect(slotOverlapsBusy('14:30', 3600, date, busy)).toBe(true);
  });

  it('перекрывает — слот заканчивается внутри busy', () => {
    // 13:30-14:30 vs 14:00-15:00
    expect(slotOverlapsBusy('13:30', 3600, date, busy)).toBe(true);
  });

  it('перекрывает — слот полностью покрывает busy', () => {
    // 13:00-16:00 (3ч) vs 14:00-15:00
    expect(slotOverlapsBusy('13:00', 10800, date, busy)).toBe(true);
  });

  it('перекрывает — слот полностью внутри busy', () => {
    // 18:30-19:30 vs 18:00-20:00
    expect(slotOverlapsBusy('18:30', 3600, date, busy)).toBe(true);
  });

  it('не перекрывает — слот впритык до busy (конец = начало)', () => {
    // 13:00-14:00 vs 14:00-15:00 — граница не считается overlap
    expect(slotOverlapsBusy('13:00', 3600, date, busy)).toBe(false);
  });

  it('не перекрывает — пустой массив busy', () => {
    expect(slotOverlapsBusy('14:00', 3600, date, [])).toBe(false);
  });

  it('корректно обрабатывает время без ведущего нуля (alteg.io формат)', () => {
    // 9:00-10:00 — padTime внутри должен привести к "09:00"
    expect(slotOverlapsBusy('9:00', 3600, date, busy)).toBe(false);
  });

  it('перекрывает двухчасовой слот с вечерним busy', () => {
    // 17:00-19:00 vs 18:00-20:00
    expect(slotOverlapsBusy('17:00', 7200, date, busy)).toBe(true);
  });
});
