import { describe, it, expect } from 'vitest';
import { transliterate, generateLessonId } from './transliterate';

describe('transliterate', () => {
  it('transliterates basic cyrillic letters', () => {
    expect(transliterate('абвгд')).toBe('abvgd');
    expect(transliterate('еёжзи')).toBe('eyozhzi');
    expect(transliterate('йклмн')).toBe('yklmn');
    expect(transliterate('опрст')).toBe('oprst');
    expect(transliterate('уфхцч')).toBe('ufhtsch');
    expect(transliterate('шщъыь')).toBe('shschy');
    expect(transliterate('эюя')).toBe('eyuya');
  });

  it('converts to lowercase', () => {
    expect(transliterate('АБВГД')).toBe('abvgd');
    expect(transliterate('Привет')).toBe('privet');
  });

  it('preserves latin characters', () => {
    expect(transliterate('abc')).toBe('abc');
    expect(transliterate('ABC')).toBe('abc');
  });

  it('preserves numbers', () => {
    expect(transliterate('123')).toBe('123');
    expect(transliterate('тест123')).toBe('test123');
  });

  it('preserves special characters', () => {
    expect(transliterate('привет!')).toBe('privet!');
    expect(transliterate('тест-тест')).toBe('test-test');
    expect(transliterate('один два')).toBe('odin dva');
  });

  it('handles empty string', () => {
    expect(transliterate('')).toBe('');
  });

  it('removes hard and soft signs', () => {
    // Hard sign (ъ) is removed, so подъезд → podezd
    expect(transliterate('подъезд')).toBe('podezd');
    // Soft sign (ь) is removed, so мальчик → malchik
    expect(transliterate('мальчик')).toBe('malchik');
  });

  it('handles common Russian words', () => {
    expect(transliterate('психология')).toBe('psihologiya');
    expect(transliterate('развитие')).toBe('razvitie');
    expect(transliterate('ребёнок')).toBe('rebyonok');
  });
});

describe('generateLessonId', () => {
  it('generates URL-safe ID from Russian title', () => {
    expect(generateLessonId('Введение в психологию')).toBe('vvedenie-v-psihologiyu');
    expect(generateLessonId('Развитие ребёнка')).toBe('razvitie-rebyonka');
  });

  it('handles special characters', () => {
    expect(generateLessonId('Тест: часть 1')).toBe('test-chast-1');
    expect(generateLessonId('Один, два, три!')).toBe('odin-dva-tri');
  });

  it('removes multiple consecutive dashes', () => {
    expect(generateLessonId('Тест   много   пробелов')).toBe('test-mnogo-probelov');
    expect(generateLessonId('Один---два')).toBe('odin-dva');
  });

  it('removes leading and trailing dashes', () => {
    expect(generateLessonId('--Тест--')).toBe('test');
    expect(generateLessonId('!Начало')).toBe('nachalo');
    expect(generateLessonId('Конец!')).toBe('konets');
  });

  it('limits length to 50 characters', () => {
    const longTitle = 'Очень длинное название которое должно быть обрезано до пятидесяти символов';
    const result = generateLessonId(longTitle);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('handles empty string', () => {
    expect(generateLessonId('')).toBe('');
  });

  it('handles only special characters', () => {
    expect(generateLessonId('!@#$%')).toBe('');
  });

  it('handles mixed Russian and English', () => {
    expect(generateLessonId('Урок React компонентов')).toBe('urok-react-komponentov');
  });

  it('handles numbers', () => {
    expect(generateLessonId('Урок 1')).toBe('urok-1');
    expect(generateLessonId('123 тест')).toBe('123-test');
  });
});
