import { beforeEach, describe, expect, it, vi } from 'vitest';

const cloud = vi.hoisted(() => ({
  progress: {} as Record<string, { videoResume?: Record<string, unknown> }>,
}));

vi.mock('./courseProgress/cloudSync', () => ({
  readCloudProgress: (courseId: string) => cloud.progress[courseId],
  scheduleVideoResumeUpload: vi.fn(),
}));
import {
  buildCourseContinuePath,
  getCourseVideoResumePoint,
  saveCourseVideoResumePoint,
} from './courseVideoResume';

describe('courseVideoResume', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cloud.progress = {};
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

  it('prefers a newer local resume point over cloud progress', () => {
    window.localStorage.setItem(
      'course-video-resume-v1',
      JSON.stringify({
        development: {
          path: '/development/local',
          videoId: 'local-video',
          timeSec: 80,
          updatedAt: '2026-11-02T12:00:00.000Z',
        },
      })
    );
    cloud.progress.development = {
      videoResume: {
        path: '/development/cloud',
        videoId: 'cloud-video',
        timeSec: 140,
        updatedAt: '2026-11-02T11:00:00.000Z',
      },
    };

    expect(getCourseVideoResumePoint('development')?.videoId).toBe('local-video');
  });

  it('prefers newer cloud progress over a local resume point', () => {
    window.localStorage.setItem(
      'course-video-resume-v1',
      JSON.stringify({
        development: {
          path: '/development/local',
          videoId: 'local-video',
          timeSec: 140,
          updatedAt: '2026-11-02T11:00:00.000Z',
        },
      })
    );
    cloud.progress.development = {
      videoResume: {
        path: '/development/cloud',
        videoId: 'cloud-video',
        timeSec: 80,
        updatedAt: '2026-11-02T12:00:00.000Z',
      },
    };

    expect(getCourseVideoResumePoint('development')?.videoId).toBe('cloud-video');
  });

  it('uses the point with a valid date when the other date is invalid', () => {
    window.localStorage.setItem(
      'course-video-resume-v1',
      JSON.stringify({
        development: {
          path: '/development/local',
          videoId: 'local-video',
          timeSec: 80,
          updatedAt: 'not-a-date',
        },
      })
    );
    cloud.progress.development = {
      videoResume: {
        path: '/development/cloud',
        videoId: 'cloud-video',
        timeSec: 140,
        updatedAt: '2026-11-02T12:00:00.000Z',
      },
    };

    expect(getCourseVideoResumePoint('development')?.videoId).toBe('cloud-video');
  });

  it('returns null when neither source has a valid resume point', () => {
    window.localStorage.setItem(
      'course-video-resume-v1',
      JSON.stringify({ development: { path: '', videoId: 'local-video', timeSec: 80 } })
    );
    cloud.progress.development = {
      videoResume: { path: '/development/cloud', videoId: '', timeSec: 80 },
    };

    expect(getCourseVideoResumePoint('development')).toBeNull();
  });
});
