import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COURSE_CONTENT_CACHE_KEYS,
  COURSE_CONTENT_CACHE_VERSION,
  clearCourseContentCache,
  invalidateCourseContent,
  invalidateCourseContentByCourseId,
  readCourseContentCache,
  subscribeCourseContentInvalidation,
  writeCourseContentCache,
} from './courseContentCache';

const KEY = 'periods';
const STORAGE_KEY = `course-content-cache:${KEY}`;

describe('courseContentCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns written data back (hit)', () => {
    const data = [{ period: 'intro', title: 'Интро' }];
    writeCourseContentCache(KEY, data);

    expect(readCourseContentCache(KEY)).toEqual(data);
  });

  it('returns null for absent key (miss)', () => {
    expect(readCourseContentCache(KEY)).toBeNull();
  });

  it('rejects entry with mismatched version and removes it', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: COURSE_CONTENT_CACHE_VERSION + 1, savedAt: Date.now(), data: [] })
    );

    expect(readCourseContentCache(KEY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects expired entry and removes it', () => {
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: COURSE_CONTENT_CACHE_VERSION,
        savedAt: Date.now() - eightDaysMs,
        data: [{ period: 'intro' }],
      })
    );

    expect(readCourseContentCache(KEY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('serves entry that is not yet expired', () => {
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: COURSE_CONTENT_CACHE_VERSION,
        savedAt: Date.now() - sixDaysMs,
        data: [{ period: 'intro' }],
      })
    );

    expect(readCourseContentCache(KEY)).toEqual([{ period: 'intro' }]);
  });

  it('handles corrupted JSON without throwing and removes it', () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken json');

    expect(readCourseContentCache(KEY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects non-object envelope (valid JSON of wrong shape)', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify('just a string'));

    expect(readCourseContentCache(KEY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not throw when localStorage write fails (quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => writeCourseContentCache(KEY, [{ period: 'intro' }])).not.toThrow();
  });

  it('clearCourseContentCache removes only its key', () => {
    writeCourseContentCache(KEY, ['a']);
    writeCourseContentCache('clinical-topics', ['b']);

    clearCourseContentCache(KEY);

    expect(readCourseContentCache(KEY)).toBeNull();
    expect(readCourseContentCache('clinical-topics')).toEqual(['b']);
  });

  it('invalidateCourseContent clears storage and notifies subscribers', async () => {
    writeCourseContentCache(KEY, ['stale']);
    const listener = vi.fn();
    subscribeCourseContentInvalidation(KEY, listener);

    await invalidateCourseContent(KEY);

    expect(readCourseContentCache(KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribed listener is not notified', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCourseContentInvalidation(KEY, listener);
    unsubscribe();

    await invalidateCourseContent(KEY);

    expect(listener).not.toHaveBeenCalled();
  });

  it('invalidateCourseContentByCourseId maps core course to its cache key', async () => {
    writeCourseContentCache(COURSE_CONTENT_CACHE_KEYS.clinical, ['stale']);
    const listener = vi.fn();
    subscribeCourseContentInvalidation(COURSE_CONTENT_CACHE_KEYS.clinical, listener);

    await invalidateCourseContentByCourseId('clinical');

    expect(readCourseContentCache(COURSE_CONTENT_CACHE_KEYS.clinical)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('invalidateCourseContentByCourseId is a no-op for dynamic courses', async () => {
    writeCourseContentCache(KEY, ['kept']);

    await invalidateCourseContentByCourseId('my-dynamic-course');

    expect(readCourseContentCache(KEY)).toEqual(['kept']);
  });
});
