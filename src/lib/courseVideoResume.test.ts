import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildCourseContinuePath,
  getCourseVideoResumePoint,
  saveCourseVideoResumePoint,
} from './courseVideoResume';

describe('courseVideoResume', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and reads resume point by course', () => {
    saveCourseVideoResumePoint({
      courseId: 'clinical',
      path: '/clinical/2',
      videoId: 'video-123',
      timeMs: 64_999,
      lessonLabel: 'Нарушения мышления',
      videoTitle: 'Лекция 2',
    });

    expect(getCourseVideoResumePoint('clinical')).toMatchObject({
      path: '/clinical/2',
      videoId: 'video-123',
      timeSec: 64,
      lessonLabel: 'Нарушения мышления',
      videoTitle: 'Лекция 2',
    });
  });

  it('builds continue path with study params from saved point', () => {
    saveCourseVideoResumePoint({
      courseId: 'development',
      path: '/development/3',
      videoId: 'abc123',
      timeMs: 125_000,
    });

    expect(buildCourseContinuePath('development', '/development/intro')).toBe(
      '/development/3?study=1&panel=notes&video=abc123&t=125'
    );
  });

  it('falls back to provided lesson path if resume is missing', () => {
    expect(buildCourseContinuePath('general', '/general/intro')).toBe('/general/intro');
  });
});
