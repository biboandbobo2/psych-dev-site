import { describe, expect, it } from 'vitest';
import type { Period } from '../types/content';
import { buildCourseNavItems } from '../lib/courseNavItems';
import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, ROUTE_CONFIG } from '../routes';

function makeTopic(overrides: Partial<Period> = {}): Period {
  return {
    period: 'stub',
    title: 'Stub title',
    subtitle: '',
    concepts: [],
    authors: [],
    core_literature: [],
    extra_literature: [],
    extra_videos: [],
    accent: '',
    accent100: '',
    published: true,
    ...overrides,
  } as Period;
}

describe('buildCourseNavItems', () => {
  it('returns empty list for null courseId', () => {
    expect(buildCourseNavItems(null, new Map())).toEqual([]);
  });

  it('returns static ROUTE_CONFIG items for development course', () => {
    const items = buildCourseNavItems('development', new Map());
    expect(items).toHaveLength(ROUTE_CONFIG.length);
    expect(items[0].path).toBe(ROUTE_CONFIG[0].path);
    expect(items[0].label).toBe(ROUTE_CONFIG[0].navLabel);
  });

  it('returns static CLINICAL_ROUTE_CONFIG items for clinical course', () => {
    const items = buildCourseNavItems('clinical', new Map());
    expect(items).toHaveLength(CLINICAL_ROUTE_CONFIG.length);
    expect(items[0].path).toBe(CLINICAL_ROUTE_CONFIG[0].path);
  });

  it('returns static GENERAL_ROUTE_CONFIG items for general course', () => {
    const items = buildCourseNavItems('general', new Map());
    expect(items).toHaveLength(GENERAL_ROUTE_CONFIG.length);
    expect(items[0].path).toBe(GENERAL_ROUTE_CONFIG[0].path);
  });

  it('merges Firestore-only lessons into core courses', () => {
    const topics = new Map<string, Period>([
      ['general-1', makeTopic({ period: 'general-1', title: 'Firestore title', order: 0 })],
      ['vnimanie-teorii', makeTopic({ period: 'vnimanie-teorii', title: 'Внимание: теории', order: 4 })],
      ['draft', makeTopic({ period: 'draft', title: 'Черновик', order: 5, published: false })],
    ]);
    const items = buildCourseNavItems('general', topics);
    expect(items).toContainEqual({ path: '/general/1', label: 'Firestore title' });
    expect(items).toContainEqual({ path: '/general/vnimanie-teorii', label: 'Внимание: теории' });
    expect(items.some((item) => item.path === '/general/draft')).toBe(false);
  });

  it('keeps static intro before Firestore lessons with order 0', () => {
    const items = buildCourseNavItems(
      'general',
      new Map([
        ['general-1', makeTopic({ period: 'general-1', title: 'Первое занятие', order: 0 })],
        ['general-2', makeTopic({ period: 'general-2', title: 'Второе занятие', order: 1 })],
      ])
    );

    expect(items.slice(0, 3)).toEqual([
      { path: '/general/intro', label: 'Введение' },
      { path: '/general/1', label: 'Первое занятие' },
      { path: '/general/2', label: 'Второе занятие' },
    ]);
  });

  it('can require backing data for static core routes', () => {
    const items = buildCourseNavItems(
      'general',
      new Map([
        ['general-1', makeTopic({ period: 'general-1', title: 'Firestore title', order: 0 })],
      ]),
      { includeMissingStaticRoutes: false }
    );

    expect(items).toEqual([{ path: '/general/1', label: 'Firestore title' }]);
  });

  it('builds items for dynamic course from topics sorted by order', () => {
    const topics = new Map<string, Period>([
      ['lesson-a', makeTopic({ title: 'Lesson A', order: 2 })],
      ['lesson-b', makeTopic({ title: 'Lesson B', order: 1 })],
      ['lesson-c', makeTopic({ title: 'Lesson C', order: 3 })],
    ]);
    const items = buildCourseNavItems('group-therapy', topics);
    expect(items).toEqual([
      { path: '/course/group-therapy/lesson-b', label: 'Lesson B' },
      { path: '/course/group-therapy/lesson-a', label: 'Lesson A' },
      { path: '/course/group-therapy/lesson-c', label: 'Lesson C' },
    ]);
  });

  it('falls back to label then periodId when title is missing', () => {
    const topics = new Map<string, Period>([
      ['lesson-x', makeTopic({ title: '', label: 'Labelled', order: 1 })],
      ['lesson-y', makeTopic({ title: '', label: undefined, order: 2 })],
    ]);
    const items = buildCourseNavItems('my-course', topics);
    expect(items[0].label).toBe('Labelled');
    expect(items[1].label).toBe('lesson-y');
  });

  it('filters out unpublished topics for dynamic course', () => {
    const topics = new Map<string, Period>([
      ['published', makeTopic({ title: 'Published', order: 1, published: true })],
      ['draft', makeTopic({ title: 'Draft', order: 2, published: false })],
    ]);
    const items = buildCourseNavItems('my-course', topics);
    expect(items).toHaveLength(1);
    expect(items[0].path).toBe('/course/my-course/published');
  });
});
