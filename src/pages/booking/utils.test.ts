import { describe, it, expect } from 'vitest';
import { parseDisplayName, hasFullName } from './utils';

describe('parseDisplayName', () => {
  it('splits "Имя Фамилия" by the last space', () => {
    expect(parseDisplayName('Иван Иванов')).toEqual({ firstName: 'Иван', lastName: 'Иванов' });
  });

  it('treats multi-word first names by splitting on the LAST space', () => {
    expect(parseDisplayName('Анна Мария Петрова')).toEqual({
      firstName: 'Анна Мария',
      lastName: 'Петрова',
    });
  });

  it('returns whole string as firstName when there is no space', () => {
    expect(parseDisplayName('Алексей')).toEqual({ firstName: 'Алексей', lastName: '' });
  });

  it('returns empty object on null/undefined/empty', () => {
    expect(parseDisplayName(null)).toEqual({ firstName: '', lastName: '' });
    expect(parseDisplayName(undefined)).toEqual({ firstName: '', lastName: '' });
    expect(parseDisplayName('')).toEqual({ firstName: '', lastName: '' });
    expect(parseDisplayName('   ')).toEqual({ firstName: '', lastName: '' });
  });

  it('collapses multiple spaces and trims', () => {
    expect(parseDisplayName('  Иван   Иванов  ')).toEqual({
      firstName: 'Иван',
      lastName: 'Иванов',
    });
  });
});

describe('hasFullName', () => {
  it('returns true when both names have ≥2 characters', () => {
    expect(hasFullName('Иван Иванов')).toBe(true);
    expect(hasFullName('Ан Ив')).toBe(true);
  });

  it('returns false when one part is too short', () => {
    expect(hasFullName('Иван И')).toBe(false);
    expect(hasFullName('А Иванов')).toBe(false);
  });

  it('returns false for single-word names', () => {
    expect(hasFullName('Алексей')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(hasFullName(null)).toBe(false);
    expect(hasFullName(undefined)).toBe(false);
    expect(hasFullName('')).toBe(false);
  });
});
