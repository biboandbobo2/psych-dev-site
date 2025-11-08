import { describe, it, expect } from 'vitest';
import { buildTestChains } from './testChainHelpers';

describe('buildTestChains', () => {
  it('should return empty array for empty input', () => {
    const result = buildTestChains([]);
    expect(result).toEqual([]);
  });

  it('should accept array of tests and return array of chains', () => {
    const tests = [
      {
        id: 'test-1',
        title: 'Test 1',
        questions: [],
        prerequisiteTestId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'test-2',
        title: 'Test 2',
        questions: [],
        prerequisiteTestId: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ] as any[];

    const result = buildTestChains(tests);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should create chains with root property', () => {
    const tests = [
      {
        id: 'test-1',
        title: 'Test 1',
        questions: [],
        prerequisiteTestId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any[];

    const result = buildTestChains(tests);
    expect(result[0]).toHaveProperty('root');
    expect(result[0].root).toHaveProperty('id');
  });
});
