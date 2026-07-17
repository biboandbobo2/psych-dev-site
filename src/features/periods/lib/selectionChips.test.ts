import { describe, expect, it } from 'vitest';
import {
  conceptLabel,
  extractConceptChips,
  isShortSelection,
  truncatedQuery,
} from './selectionChips';

describe('isShortSelection', () => {
  it('короткий термин — короткое выделение', () => {
    expect(isShortSelection('сепарационная тревога')).toBe(true);
  });

  it('длинная фраза из лекции — не короткое', () => {
    expect(
      isShortSelection('и вот когда ребёнок остаётся один, у него возникает вот эта самая тревога'),
    ).toBe(false);
  });
});

describe('conceptLabel', () => {
  it('обрезает описание после тире', () => {
    expect(conceptLabel('Привязанность — эмоциональная связь ребёнка со взрослым')).toBe(
      'Привязанность',
    );
  });

  it('обрезает после двоеточия и скобки', () => {
    expect(conceptLabel('Сепарация: процесс отделения')).toBe('Сепарация');
    expect(conceptLabel('Госпитализм (Шпиц)')).toBe('Госпитализм');
  });
});

describe('extractConceptChips', () => {
  const concepts = [
    'Привязанность — эмоциональная связь',
    'Сепарационная тревога',
    'Госпитализм (Шпиц)',
  ];

  it('находит понятие в выделении с учётом падежа', () => {
    const chips = extractConceptChips(
      'ребёнок с надёжной привязанностью спокойнее переживает разлуку',
      concepts,
    );
    expect(chips).toEqual(['Привязанность']);
  });

  it('находит несколько понятий', () => {
    const chips = extractConceptChips(
      'привязанность формируется рано, а госпитализм — следствие её депривации',
      concepts,
    );
    expect(chips).toEqual(['Привязанность', 'Госпитализм']);
  });

  it('пустой список, если ничего не совпало', () => {
    expect(extractConceptChips('дважды два четыре', concepts)).toEqual([]);
  });
});

describe('truncatedQuery', () => {
  it('обрезает до 8 слов', () => {
    const long = 'один два три четыре пять шесть семь восемь девять десять';
    expect(truncatedQuery(long)).toBe('один два три четыре пять шесть семь восемь');
  });
});
