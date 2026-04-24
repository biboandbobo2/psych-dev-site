import { describe, expect, it } from 'vitest';
import type { Period } from '../types/content';
import { buildCourseNavItems } from './useCourseNavItems';
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

  it('ignores topics argument for core courses', () => {
    const topics = new Map<string, Period>([
      ['custom-lesson', makeTopic({ title: 'Custom', order: 0 })],
    ]);
    const coreItems = buildCourseNavItems('development', topics);
    expect(coreItems).toHaveLength(ROUTE_CONFIG.length);
    expect(coreItems.every((item) => item.path.startsWith('/'))).toBe(true);
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
