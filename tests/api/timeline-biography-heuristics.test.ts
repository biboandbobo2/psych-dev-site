import { describe, expect, it } from 'vitest';
import {
  inferBirthDetailsFromExtract,
  inferDeathYearFromExtract,
} from '../../server/api/timelineBiography.js';

describe('timelineBiographyHeuristics', () => {
  it('не принимает второй случайный год из короткого extract за год смерти', () => {
    const extract = [
      'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
      'В 1811 году поступил в Царскосельский лицей.',
      'В 1837 году погиб после дуэли.',
    ].join(' ');

    expect(inferBirthDetailsFromExtract(extract).birthYear).toBe(1799);
    expect(inferDeathYearFromExtract(extract)).toBe(1837);
  });

  it('берёт год смерти из диапазона дат в lead-строке', () => {
    const extract = [
      'Елизавета II (21 апреля 1926, Мейфэр, Большой Лондон, Англия — 8 сентября 2022, Балморал, Абердиншир, Шотландия) — королева.',
      'В 1953 году состоялась коронация.',
    ].join(' ');

    expect(inferBirthDetailsFromExtract(extract).birthYear).toBe(1926);
    expect(inferDeathYearFromExtract(extract)).toBe(2022);
  });

});

// Д-B3: buildBirthDetails при известном месяце отдаёт дату в формате «M/YYYY»,
// а russianDateToISO сваливал её в year-only fallback → «YYYY-01-01»:
// известный месяц рождения молча терялся.
describe('russianDateToISO', () => {
  it('сохраняет месяц из формата «M/YYYY»', async () => {
    const { russianDateToISO } = await import('../../server/api/timelineBiographyHeuristics.js');
    expect(russianDateToISO('6/1828')).toBe('1828-06-01');
    expect(russianDateToISO('12/1828')).toBe('1828-12-01');
  });

  it('не регрессирует существующие форматы', async () => {
    const { russianDateToISO } = await import('../../server/api/timelineBiographyHeuristics.js');
    expect(russianDateToISO('26 мая 1799')).toBe('1799-05-26');
    expect(russianDateToISO('1799-05-26')).toBe('1799-05-26');
    expect(russianDateToISO('1828')).toBe('1828-01-01');
    expect(russianDateToISO(undefined)).toBeUndefined();
  });
});
