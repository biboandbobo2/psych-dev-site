import { describe, expect, it } from 'vitest';
import {
  areSameSelections,
  buildPreviewText,
  escapeForRegExp,
} from './highlight';

describe('areSameSelections', () => {
  it('пустые массивы равны', () => {
    expect(areSameSelections([], [])).toBe(true);
  });

  it('одинаковые элементы независимо от порядка', () => {
    expect(areSameSelections(['a', 'b'], ['b', 'a'])).toBe(true);
  });

  it('разные длины не равны', () => {
    expect(areSameSelections(['a'], ['a', 'b'])).toBe(false);
  });

  it('разные элементы не равны', () => {
    expect(areSameSelections(['a', 'b'], ['a', 'c'])).toBe(false);
  });
});

describe('escapeForRegExp', () => {
  it('экранирует все спецсимволы regex', () => {
    expect(escapeForRegExp('.*+?')).toBe('\\.\\*\\+\\?');
    expect(escapeForRegExp('[a]')).toBe('\\[a\\]');
    expect(escapeForRegExp('a|b')).toBe('a\\|b');
  });

  it('обычный текст без изменений', () => {
    expect(escapeForRegExp('hello world')).toBe('hello world');
  });
});

describe('buildPreviewText', () => {
  it('пустая строка → ""', () => {
    expect(buildPreviewText('', 'q')).toBe('');
    expect(buildPreviewText('   ', 'q')).toBe('');
  });

  it('короткий текст возвращается как есть (без обрезки)', () => {
    const text = 'короткий текст до 120 символов';
    expect(buildPreviewText(text, '', 120)).toBe(text);
  });

  it('длинный текст без query → head + "..."', () => {
    const text = 'a'.repeat(200);
    const result = buildPreviewText(text, '', 50);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(53);
  });

  it('длинный текст с query → окно вокруг совпадения', () => {
    const text = 'a'.repeat(80) + 'TARGET' + 'b'.repeat(80);
    const result = buildPreviewText(text, 'TARGET', 60);
    expect(result.includes('TARGET')).toBe(true);
    expect(result.startsWith('...')).toBe(true);
    expect(result.endsWith('...')).toBe(true);
  });

  it('query не найден в длинном тексте → head + "..."', () => {
    const text = 'a'.repeat(200);
    const result = buildPreviewText(text, 'TARGET', 50);
    expect(result.endsWith('...')).toBe(true);
    expect(result.includes('TARGET')).toBe(false);
  });
});
