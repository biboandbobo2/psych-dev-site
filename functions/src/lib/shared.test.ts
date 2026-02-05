import { describe, it, expect } from 'vitest';
import {
  toPendingUid,
  extractCourseAccess,
  normalizeEmail,
  isValidEmail,
  normalizeEmailList,
  normalizeCourseIds,
  SUPER_ADMIN_EMAIL,
} from './shared';

describe('SUPER_ADMIN_EMAIL', () => {
  it('is defined and non-empty', () => {
    expect(SUPER_ADMIN_EMAIL).toBeTruthy();
    expect(typeof SUPER_ADMIN_EMAIL).toBe('string');
  });
});

describe('toPendingUid', () => {
  it('produces deterministic uid from email', () => {
    const uid1 = toPendingUid('test@example.com');
    const uid2 = toPendingUid('test@example.com');
    expect(uid1).toBe(uid2);
  });

  it('starts with "pending_" prefix', () => {
    expect(toPendingUid('a@b.com')).toMatch(/^pending_/);
  });

  it('different emails produce different uids', () => {
    expect(toPendingUid('a@b.com')).not.toBe(toPendingUid('c@d.com'));
  });

  it('uses base64url encoding (no +/= characters)', () => {
    const uid = toPendingUid('test+special@example.com');
    const encoded = uid.replace('pending_', '');
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe('extractCourseAccess', () => {
  it('returns empty object for null/undefined', () => {
    expect(extractCourseAccess(null)).toEqual({});
    expect(extractCourseAccess(undefined)).toEqual({});
  });

  it('returns empty object for non-object values', () => {
    expect(extractCourseAccess('string')).toEqual({});
    expect(extractCourseAccess(42)).toEqual({});
    expect(extractCourseAccess(true)).toEqual({});
  });

  it('returns empty object for arrays', () => {
    expect(extractCourseAccess([1, 2, 3])).toEqual({});
  });

  it('extracts only boolean values', () => {
    const input = {
      development: true,
      clinical: false,
      general: 'yes',
      custom: 42,
      another: null,
    };
    expect(extractCourseAccess(input)).toEqual({
      development: true,
      clinical: false,
    });
  });

  it('handles empty object', () => {
    expect(extractCourseAccess({})).toEqual({});
  });
});

describe('normalizeEmail', () => {
  it('trims whitespace', () => {
    expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('converts to lowercase', () => {
    expect(normalizeEmail('Test@EXAMPLE.Com')).toBe('test@example.com');
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co')).toBe(true);
    expect(isValidEmail('a@b.c')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user @domain.com')).toBe(false);
  });
});

describe('normalizeEmailList', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeEmailList(null)).toEqual([]);
    expect(normalizeEmailList('string')).toEqual([]);
    expect(normalizeEmailList(42)).toEqual([]);
  });

  it('filters non-string items', () => {
    expect(normalizeEmailList([42, null, undefined, true])).toEqual([]);
  });

  it('filters invalid emails', () => {
    expect(normalizeEmailList(['valid@test.com', 'not-email', '', '  '])).toEqual(['valid@test.com']);
  });

  it('normalizes and deduplicates', () => {
    const result = normalizeEmailList([
      'Test@Example.com',
      'test@example.com',
      '  TEST@EXAMPLE.COM  ',
      'other@test.com',
    ]);
    expect(result).toEqual(['test@example.com', 'other@test.com']);
  });
});

describe('normalizeCourseIds', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeCourseIds(null)).toEqual([]);
    expect(normalizeCourseIds('string')).toEqual([]);
    expect(normalizeCourseIds(42)).toEqual([]);
  });

  it('filters non-string items', () => {
    expect(normalizeCourseIds([42, null, undefined, true])).toEqual([]);
  });

  it('trims and filters empty strings', () => {
    expect(normalizeCourseIds(['  development  ', '', '  ', 'clinical'])).toEqual([
      'development',
      'clinical',
    ]);
  });

  it('deduplicates', () => {
    const result = normalizeCourseIds(['development', 'development', 'clinical']);
    expect(result).toEqual(['development', 'clinical']);
  });
});
