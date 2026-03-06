import { describe, expect, it } from 'vitest';
import { normalizeAuthors, normalizeConcepts } from './contentNormalizers';

describe('contentNormalizers', () => {
  it('normalizes legacy title-based concepts into name-based items', () => {
    expect(
      normalizeConcepts([
        { title: 'Внимание', url: 'https://example.com' },
        { name: 'Память' },
      ])
    ).toEqual([
      { name: 'Внимание', url: 'https://example.com' },
      { name: 'Память' },
    ]);
  });

  it('normalizes legacy title-based authors into name-based items', () => {
    expect(
      normalizeAuthors([
        { title: 'Выготский', url: 'https://example.com' },
        { name: 'Лурия' },
      ])
    ).toEqual([
      { name: 'Выготский', url: 'https://example.com' },
      { name: 'Лурия' },
    ]);
  });
});
