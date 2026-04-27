import { describe, expect, it } from 'vitest';
import { mergeCoreCoursePlaceholders } from './mergeCoreCoursePlaceholders';
import type { AdminPeriod } from './types';

const period = (id: string, overrides: Partial<AdminPeriod> = {}): AdminPeriod => ({
  period: id,
  title: id,
  subtitle: '',
  published: true,
  order: 0,
  accent: '',
  ...overrides,
});

describe('mergeCoreCoursePlaceholders', () => {
  it('non-core курс возвращается как есть (только сортировка)', () => {
    const periods = [period('lesson-1'), period('lesson-2')];
    const result = mergeCoreCoursePlaceholders('custom-course', periods, { isCore: false });
    expect(result.map((p) => p.period).sort()).toEqual(['lesson-1', 'lesson-2']);
    expect(result.some((p) => p.isPlaceholder)).toBe(false);
  });

  it('core development: добавляет placeholder только для отсутствующих периодов', () => {
    const real = [period('infancy', { published: true })];
    const result = mergeCoreCoursePlaceholders('development', real, { isCore: true });
    const ids = result.map((p) => p.period);
    expect(ids).toContain('infancy');
    expect(ids).toContain('preschool');
    const realInfancy = result.find((p) => p.period === 'infancy');
    expect(realInfancy?.isPlaceholder).toBeUndefined();
    const placeholderPreschool = result.find((p) => p.period === 'preschool');
    expect(placeholderPreschool?.isPlaceholder).toBe(true);
    expect(placeholderPreschool?.published).toBe(false);
  });

  it('core development: не добавляет placeholder для intro', () => {
    const result = mergeCoreCoursePlaceholders('development', [], { isCore: true });
    expect(result.find((p) => p.period === 'intro')).toBeUndefined();
  });

  it('core clinical: не добавляет placeholder для clinical-intro', () => {
    const result = mergeCoreCoursePlaceholders('clinical', [], { isCore: true });
    expect(result.find((p) => p.period === 'clinical-intro')).toBeUndefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.isPlaceholder)).toBe(true);
  });

  it('core general: создаёт placeholder для всех тем включая general-intro', () => {
    // general-intro исключения нет: оригинал исключал только intro и clinical-intro,
    // поэтому general-intro попадает в placeholder. Это поведение зафиксировано.
    const result = mergeCoreCoursePlaceholders('general', [], { isCore: true });
    expect(result.find((p) => p.period === 'general-intro')?.isPlaceholder).toBe(true);
    expect(result.find((p) => p.period === 'general-1')?.isPlaceholder).toBe(true);
  });

  it('placeholder использует navLabel из route и placeholder/description fallback', () => {
    const result = mergeCoreCoursePlaceholders('development', [], { isCore: true });
    const preschool = result.find((p) => p.period === 'preschool');
    expect(preschool?.title).toBe('Дошкольный возраст (3–7 лет)');
    expect(preschool?.subtitle).toMatch(/3–7|игр/i);
  });
});
