import { describe, expect, it } from 'vitest';
import { inferBirthDetailsFromExtract, inferDeathYearFromExtract } from '../../server/api/timelineBiography.js';

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
