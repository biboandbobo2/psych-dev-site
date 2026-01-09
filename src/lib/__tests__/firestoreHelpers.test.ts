import { describe, it, expect } from 'vitest';
import {
  canonicalizePeriodId,
  parseDelimitedString,
  parseLinks,
  stringifyLinks,
  stringifyArray,
} from '../firestoreHelpers';

describe('firestoreHelpers', () => {
  describe('canonicalizePeriodId', () => {
    it('converts legacy "school" ID to canonical "primary-school"', () => {
      expect(canonicalizePeriodId('school')).toBe('primary-school');
    });

    it('returns same ID if not legacy', () => {
      expect(canonicalizePeriodId('primary-school')).toBe('primary-school');
      expect(canonicalizePeriodId('intro')).toBe('intro');
      expect(canonicalizePeriodId('toddler')).toBe('toddler');
      expect(canonicalizePeriodId('unknown-period')).toBe('unknown-period');
    });

    it('handles empty string', () => {
      expect(canonicalizePeriodId('')).toBe('');
    });
  });

  describe('parseDelimitedString', () => {
    it('parses pipe-delimited string into array', () => {
      expect(parseDelimitedString('one|two|three')).toEqual(['one', 'two', 'three']);
    });

    it('trims whitespace from values', () => {
      expect(parseDelimitedString('  one  |  two  |  three  ')).toEqual(['one', 'two', 'three']);
    });

    it('filters out empty values', () => {
      expect(parseDelimitedString('one||two|  |three')).toEqual(['one', 'two', 'three']);
    });

    it('returns empty array for undefined', () => {
      expect(parseDelimitedString(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseDelimitedString('')).toEqual([]);
    });

    it('handles single value', () => {
      expect(parseDelimitedString('single')).toEqual(['single']);
    });

    it('handles string with only delimiters', () => {
      expect(parseDelimitedString('|||')).toEqual([]);
    });
  });

  describe('parseLinks', () => {
    it('parses link format "title::url" with pipe delimiter', () => {
      const input = 'Google::https://google.com|GitHub::https://github.com';
      expect(parseLinks(input)).toEqual([
        { title: 'Google', url: 'https://google.com' },
        { title: 'GitHub', url: 'https://github.com' },
      ]);
    });

    it('trims whitespace from titles and URLs', () => {
      const input = '  Google  ::  https://google.com  ';
      expect(parseLinks(input)).toEqual([
        { title: 'Google', url: 'https://google.com' },
      ]);
    });

    it('filters out links without title', () => {
      const input = '::https://google.com|GitHub::https://github.com';
      expect(parseLinks(input)).toEqual([
        { title: 'GitHub', url: 'https://github.com' },
      ]);
    });

    it('filters out links without URL', () => {
      const input = 'Google::|GitHub::https://github.com';
      expect(parseLinks(input)).toEqual([
        { title: 'GitHub', url: 'https://github.com' },
      ]);
    });

    it('filters out completely empty links', () => {
      const input = '::|GitHub::https://github.com|::';
      expect(parseLinks(input)).toEqual([
        { title: 'GitHub', url: 'https://github.com' },
      ]);
    });

    it('returns empty array for undefined', () => {
      expect(parseLinks(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseLinks('')).toEqual([]);
    });

    it('handles single link', () => {
      expect(parseLinks('Google::https://google.com')).toEqual([
        { title: 'Google', url: 'https://google.com' },
      ]);
    });

    it('handles malformed entries (no ::)', () => {
      // Entry without :: will have url as empty string
      const input = 'malformed|GitHub::https://github.com';
      expect(parseLinks(input)).toEqual([
        { title: 'GitHub', url: 'https://github.com' },
      ]);
    });
  });

  describe('stringifyLinks', () => {
    it('converts links array to pipe-delimited string', () => {
      const links = [
        { title: 'Google', url: 'https://google.com' },
        { title: 'GitHub', url: 'https://github.com' },
      ];
      expect(stringifyLinks(links)).toBe('Google::https://google.com|GitHub::https://github.com');
    });

    it('filters out links without title', () => {
      const links = [
        { title: '', url: 'https://google.com' },
        { title: 'GitHub', url: 'https://github.com' },
      ];
      expect(stringifyLinks(links)).toBe('GitHub::https://github.com');
    });

    it('filters out links without URL', () => {
      const links = [
        { title: 'Google', url: '' },
        { title: 'GitHub', url: 'https://github.com' },
      ];
      expect(stringifyLinks(links)).toBe('GitHub::https://github.com');
    });

    it('returns empty string for empty array', () => {
      expect(stringifyLinks([])).toBe('');
    });

    it('returns empty string when all links are invalid', () => {
      const links = [
        { title: '', url: 'https://google.com' },
        { title: 'Google', url: '' },
      ];
      expect(stringifyLinks(links)).toBe('');
    });

    it('handles single link', () => {
      const links = [{ title: 'Google', url: 'https://google.com' }];
      expect(stringifyLinks(links)).toBe('Google::https://google.com');
    });
  });

  describe('stringifyArray', () => {
    it('joins array with pipe delimiter', () => {
      expect(stringifyArray(['one', 'two', 'three'])).toBe('one|two|three');
    });

    it('filters out empty strings', () => {
      expect(stringifyArray(['one', '', 'two', '', 'three'])).toBe('one|two|three');
    });

    it('returns empty string for empty array', () => {
      expect(stringifyArray([])).toBe('');
    });

    it('handles single value', () => {
      expect(stringifyArray(['single'])).toBe('single');
    });

    it('filters out all empty values', () => {
      expect(stringifyArray(['', '', ''])).toBe('');
    });
  });

  describe('parseLinks ↔ stringifyLinks roundtrip', () => {
    it('maintains data through conversion', () => {
      const original = [
        { title: 'Google', url: 'https://google.com' },
        { title: 'GitHub', url: 'https://github.com' },
      ];
      const stringified = stringifyLinks(original);
      const parsed = parseLinks(stringified);
      expect(parsed).toEqual(original);
    });
  });

  describe('parseDelimitedString ↔ stringifyArray roundtrip', () => {
    it('maintains data through conversion', () => {
      const original = ['one', 'two', 'three'];
      const stringified = stringifyArray(original);
      const parsed = parseDelimitedString(stringified);
      expect(parsed).toEqual(original);
    });
  });
});
