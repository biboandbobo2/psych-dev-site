import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { PeriodFormData } from '../../src/types/content';
import {
  deletePeriod,
  getAllPeriods,
  getPeriod,
  getPublishedPeriods,
  savePeriod,
} from '../../src/lib/firestoreHelpers';
import { initializeIntegrationApp, resetIntegrationData } from './helper';

const basePeriod: PeriodFormData = {
  period: 'infancy',
  title: 'Интеграционный период',
  subtitle: 'Проверка e2e',
  concepts: [],
  authors: [],
  core_literature: [],
  extra_literature: [],
  extra_videos: [],
  accent: '#3b82f6',
  accent100: '#bfdbfe',
  background: '#ffffff',
  published: true,
  order: 1,
};

const schoolPeriod: PeriodFormData = {
  period: 'school',
  title: 'Школьный период',
  subtitle: 'Legacy alias',
  concepts: [],
  authors: [],
  core_literature: [],
  extra_literature: [],
  extra_videos: [],
  accent: '#10b981',
  accent100: '#a7f3d0',
  background: '#ffffff',
  published: false,
  order: 2,
};

beforeAll(async () => {
  await initializeIntegrationApp();
});

beforeEach(async () => {
  await resetIntegrationData();
});

describe('firestoreHelpers periods', () => {
  it('сохраняет и читает периоды с учётом canonical и публицикации', async () => {
    await savePeriod('infancy', basePeriod);
    await savePeriod('school', schoolPeriod);

    const fetchedInfancy = await getPeriod('infancy');
    expect(fetchedInfancy).not.toBeNull();
    expect(fetchedInfancy?.title).toBe(basePeriod.title);
    expect(fetchedInfancy?.published).toBe(true);

    const canonicalSchool = await getPeriod('primary-school');
    expect(canonicalSchool).not.toBeNull();
    expect(canonicalSchool?.title).toBe(schoolPeriod.title);

    const aliasSchool = await getPeriod('school');
    expect(aliasSchool?.period).toBe('primary-school');

    const allPeriods = await getAllPeriods();
    expect(allPeriods.map((period) => period.period)).toEqual(['infancy', 'primary-school']);

    const publishedOnly = await getPublishedPeriods();
    expect(publishedOnly).toHaveLength(1);
    expect(publishedOnly[0].period).toBe('infancy');

    await deletePeriod('school');

    expect(await getPeriod('primary-school')).toBeNull();
    expect(await getPeriod('school')).toBeNull();
  });
});
