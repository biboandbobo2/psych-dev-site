import { describe, expect, it } from 'vitest';
import { normalizeAgeRange } from './notes';

describe('normalizeAgeRange', () => {
  it('нормализует legacy alias school', () => {
    expect(normalizeAgeRange('school')).toBe('primary-school');
  });

  it('нормализует early-childhood к infancy', () => {
    expect(normalizeAgeRange('early-childhood')).toBe('infancy');
  });

  it('возвращает null для неизвестного периода', () => {
    expect(normalizeAgeRange('unknown-period')).toBeNull();
  });
});
