import { beforeEach, describe, expect, it } from 'vitest';
import {
  getWatchedLessonIds,
  isLessonWatched,
  markLessonWatched,
  unmarkLessonWatched,
} from './courseWatchedLessons';

describe('courseWatchedLessons', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('marks lesson as watched and reads it back', () => {
    const changed = markLessonWatched('development', 'intro');

    expect(changed).toBe(true);
    expect(isLessonWatched('development', 'intro')).toBe(true);
    expect(getWatchedLessonIds('development')).toEqual(new Set(['intro']));
  });

  it('does not duplicate watched lesson', () => {
    markLessonWatched('clinical', 'theme-1');
    const changed = markLessonWatched('clinical', 'theme-1');

    expect(changed).toBe(false);
    expect(getWatchedLessonIds('clinical')).toEqual(new Set(['theme-1']));
  });

  it('keeps watched lessons isolated by course', () => {
    markLessonWatched('development', 'intro');
    markLessonWatched('clinical', 'intro');

    expect(getWatchedLessonIds('development')).toEqual(new Set(['intro']));
    expect(getWatchedLessonIds('clinical')).toEqual(new Set(['intro']));
  });

  it('removes watched lesson when unmarked', () => {
    markLessonWatched('development', 'intro');
    const changed = unmarkLessonWatched('development', 'intro');

    expect(changed).toBe(true);
    expect(isLessonWatched('development', 'intro')).toBe(false);
    expect(getWatchedLessonIds('development')).toEqual(new Set());
  });
});
