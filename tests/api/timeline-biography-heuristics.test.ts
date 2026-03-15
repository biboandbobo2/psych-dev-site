import { describe, expect, it } from 'vitest';
import {
  buildHeuristicBiographyFacts,
  extractPublicRoleEventsFromExtract,
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

  it('разбивает многодатное политическое предложение на отдельные события', () => {
    const extract = [
      'Елизавета II (21 апреля 1926, Лондон — 8 сентября 2022, Балморал) — королева.',
      'В 1957 году королева назначила Гарольда Макмиллана премьер-министром после отставки Энтони Идена, в 1963 году — Александра Дуглас-Хьюма, а в 1974 году, после подвешенных выборов, вновь Гарольда Вильсона.',
    ].join(' ');

    const events = extractPublicRoleEventsFromExtract(extract, 1926);
    const labels = events.map((event) => event.label);

    expect(labels).toContain('Назначение Гарольда Макмиллана');
    expect(labels).toContain('Назначение Александра Дуглас-Хьюма');
    expect(labels).toContain('Назначение Гарольда Вильсона');
  });

  it('вытягивает высокозначимые государственные и кризисные факты монарха без writer-bias', () => {
    const extract = [
      'Елизавета II (21 апреля 1926, Лондон — 8 сентября 2022, Балморал) — королева.',
      'В 1970 году в ходе турне по Австралии и Новой Зеландии была введена практика royal walkabout.',
      'В августе 1979 года ИРА убила лорда Луиса Маунтбеттена.',
      'В июне 1981 года во время Trooping the Colour в сторону Елизаветы II было произведено шесть выстрелов.',
      'В январе 1986 года на яхте «Британия» была организована эвакуация людей из Йемена.',
      'В октябре 1986 года состоялся первый визит британского монарха в Китай.',
      'В 1992 году королева назвала год annus horribilis.',
      'В 1994 году королева посетила Россию с государственным визитом.',
      'В 2021 году Барбадос стал республикой.',
      '6 февраля 2022 года исполнилось 70 лет её пребывания на престоле.',
      '6 сентября 2022 года королева назначила Лиз Трасс премьер-министром.',
    ].join(' ');

    const facts = buildHeuristicBiographyFacts(extract, 'Елизавета II');
    const labels = facts.map((fact) => fact.labelHint);

    expect(labels).toContain('Royal walkabout');
    expect(labels).toContain('Убийство Луиса Маунтбеттена');
    expect(labels).toContain('Выстрелы на Trooping the Colour');
    expect(labels).toContain('Эвакуация из Йемена');
    expect(labels).toContain('Государственный визит в Китай');
    expect(labels).toContain('Annus horribilis');
    expect(labels).toContain('Государственный визит в Россию');
    expect(labels).toContain('Барбадос становится республикой');
    expect(labels).toContain('70 лет на престоле');
    expect(labels).toContain('Назначение Лиз Трасс');
  });
});
