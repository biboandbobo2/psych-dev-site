import { describe, it, expect } from 'vitest';
import { removeUndefined } from './removeUndefined';

describe('removeUndefined', () => {
  describe('primitive values', () => {
    it('returns null as-is', () => {
      expect(removeUndefined(null)).toBeNull();
    });

    it('returns undefined as-is', () => {
      expect(removeUndefined(undefined)).toBeUndefined();
    });

    it('returns strings as-is', () => {
      expect(removeUndefined('hello')).toBe('hello');
      expect(removeUndefined('')).toBe('');
    });

    it('returns numbers as-is', () => {
      expect(removeUndefined(42)).toBe(42);
      expect(removeUndefined(0)).toBe(0);
      expect(removeUndefined(NaN)).toBeNaN();
    });

    it('returns booleans as-is', () => {
      expect(removeUndefined(true)).toBe(true);
      expect(removeUndefined(false)).toBe(false);
    });
  });

  describe('objects', () => {
    it('removes undefined properties', () => {
      const input = { a: 1, b: undefined, c: 'test' };
      const result = removeUndefined(input);
      expect(result).toEqual({ a: 1, c: 'test' });
      expect(result).not.toHaveProperty('b');
    });

    it('keeps null properties', () => {
      const input = { a: 1, b: null };
      const result = removeUndefined(input);
      expect(result).toEqual({ a: 1, b: null });
    });

    it('keeps empty string properties', () => {
      const input = { a: '', b: 'test' };
      const result = removeUndefined(input);
      expect(result).toEqual({ a: '', b: 'test' });
    });

    it('keeps zero and false properties', () => {
      const input = { a: 0, b: false, c: undefined };
      const result = removeUndefined(input);
      expect(result).toEqual({ a: 0, b: false });
    });

    it('handles empty object', () => {
      expect(removeUndefined({})).toEqual({});
    });

    it('handles object with all undefined', () => {
      const input = { a: undefined, b: undefined };
      expect(removeUndefined(input)).toEqual({});
    });
  });

  describe('nested objects', () => {
    it('recursively removes undefined from nested objects', () => {
      const input = {
        a: 1,
        b: {
          c: 2,
          d: undefined,
          e: {
            f: 3,
            g: undefined,
          },
        },
      };
      const result = removeUndefined(input);
      expect(result).toEqual({
        a: 1,
        b: {
          c: 2,
          e: {
            f: 3,
          },
        },
      });
    });

    it('handles deeply nested undefined', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              value: undefined,
              keep: 'yes',
            },
          },
        },
      };
      const result = removeUndefined(input);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              keep: 'yes',
            },
          },
        },
      });
    });
  });

  describe('arrays', () => {
    it('processes array elements', () => {
      const input = [1, 2, 3];
      expect(removeUndefined(input)).toEqual([1, 2, 3]);
    });

    it('keeps undefined in arrays (only removes from object properties)', () => {
      const input = [1, undefined, 3];
      // Note: The function maps over array but doesn't filter undefined elements
      expect(removeUndefined(input)).toEqual([1, undefined, 3]);
    });

    it('processes objects inside arrays', () => {
      const input = [
        { a: 1, b: undefined },
        { c: 2, d: 3 },
      ];
      const result = removeUndefined(input);
      expect(result).toEqual([{ a: 1 }, { c: 2, d: 3 }]);
    });

    it('handles nested arrays', () => {
      const input = [[{ a: undefined, b: 1 }]];
      const result = removeUndefined(input);
      expect(result).toEqual([[{ b: 1 }]]);
    });

    it('handles empty array', () => {
      expect(removeUndefined([])).toEqual([]);
    });
  });

  describe('mixed structures', () => {
    it('handles complex nested structure', () => {
      const input = {
        users: [
          { name: 'Alice', age: undefined, roles: ['admin', undefined] },
          { name: 'Bob', metadata: { created: undefined, updated: '2024' } },
        ],
        config: {
          enabled: true,
          options: undefined,
        },
        empty: undefined,
      };

      const result = removeUndefined(input);

      expect(result).toEqual({
        users: [
          { name: 'Alice', roles: ['admin', undefined] },
          { name: 'Bob', metadata: { updated: '2024' } },
        ],
        config: {
          enabled: true,
        },
      });
    });
  });

  describe('type preservation', () => {
    it('does not modify original object', () => {
      const input = { a: 1, b: undefined };
      const original = { ...input };
      removeUndefined(input);
      expect(input).toEqual(original);
    });

    it('returns new object reference', () => {
      const input = { a: 1 };
      const result = removeUndefined(input);
      expect(result).not.toBe(input);
      expect(result).toEqual(input);
    });

    it('returns new array reference', () => {
      const input = [1, 2, 3];
      const result = removeUndefined(input);
      expect(result).not.toBe(input);
      expect(result).toEqual(input);
    });
  });
});
