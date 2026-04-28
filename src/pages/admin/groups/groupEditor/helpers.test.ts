import { describe, expect, it } from 'vitest';
import { parseInviteEmails, toggleFeaturedCourse, toggleSet } from './helpers';

describe('toggleSet', () => {
  it('добавляет id, которого не было', () => {
    expect([...toggleSet(new Set(['a']), 'b')].sort()).toEqual(['a', 'b']);
  });

  it('удаляет существующий id', () => {
    expect([...toggleSet(new Set(['a', 'b']), 'a')]).toEqual(['b']);
  });

  it('не мутирует исходный Set', () => {
    const original = new Set(['a']);
    toggleSet(original, 'b');
    expect([...original]).toEqual(['a']);
  });
});

describe('parseInviteEmails', () => {
  it('разделяет по запятой, пробелу и переводу строки', () => {
    expect(parseInviteEmails('a@x.com, b@x.com\nc@x.com d@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
      'd@x.com',
    ]);
  });

  it('тримит и приводит к нижнему регистру', () => {
    expect(parseInviteEmails('   ALICE@X.com  ')).toEqual(['alice@x.com']);
  });

  it('фильтрует строки без @', () => {
    expect(parseInviteEmails('alice@x.com,bobaty,carol@x.com')).toEqual([
      'alice@x.com',
      'carol@x.com',
    ]);
  });

  it('возвращает пустой массив для пустого ввода', () => {
    expect(parseInviteEmails('')).toEqual([]);
    expect(parseInviteEmails('   ')).toEqual([]);
  });
});

describe('toggleFeaturedCourse', () => {
  it('добавляет id в пустой список', () => {
    expect(toggleFeaturedCourse([], 'c1', 3)).toEqual(['c1']);
  });

  it('убирает уже выбранный id', () => {
    expect(toggleFeaturedCourse(['c1', 'c2'], 'c1', 3)).toEqual(['c2']);
  });

  it('блокирует добавление при достижении max', () => {
    expect(toggleFeaturedCourse(['c1', 'c2', 'c3'], 'c4', 3)).toEqual(['c1', 'c2', 'c3']);
  });

  it('позволяет снять отметку даже на капе', () => {
    expect(toggleFeaturedCourse(['c1', 'c2', 'c3'], 'c2', 3)).toEqual(['c1', 'c3']);
  });

  it('не мутирует входной массив', () => {
    const input = ['c1'];
    toggleFeaturedCourse(input, 'c2', 3);
    expect(input).toEqual(['c1']);
  });
});
