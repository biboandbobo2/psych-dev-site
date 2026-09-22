import { describe, it, expect } from 'vitest';
import { buildTestChains, sortTestsByLessonOrder } from './testChainHelpers';

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

describe('sortTestsByLessonOrder', () => {
  const order = new Map([
    ['intro', 0],
    ['prenatal', 1],
    ['primary-school', 5],
  ]);
  const t = (id: string, rubric: string, created: string) => ({ id, rubric, createdAt: new Date(created) });

  it('сортирует по порядку занятий, а внутри занятия — сначала новые', () => {
    const sorted = sortTestsByLessonOrder(
      [
        t('school-old', 'primary-school', '2025-11-01'),
        t('prenatal-new', 'prenatal', '2026-09-22'),
        t('intro', 'intro', '2026-07-19'),
        t('prenatal-old', 'prenatal', '2025-11-01'),
      ],
      order
    );
    expect(sorted.map((x) => x.id)).toEqual(['intro', 'prenatal-new', 'prenatal-old', 'school-old']);
  });

  it('сводит легаси-рубрику school к primary-school, неизвестные рубрики — в конец', () => {
    const sorted = sortTestsByLessonOrder(
      [t('unknown', '15-18', '2026-01-01'), t('legacy', 'school', '2025-01-01'), t('intro', 'intro', '2024-01-01')],
      order
    );
    expect(sorted.map((x) => x.id)).toEqual(['intro', 'legacy', 'unknown']);
  });

  it('не мутирует входной массив', () => {
    const input = [t('b', 'prenatal', '2026-01-01'), t('a', 'intro', '2026-01-01')];
    sortTestsByLessonOrder(input, order);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});
