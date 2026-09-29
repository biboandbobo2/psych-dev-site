import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CloudCourseProgress } from './courseProgress/types';

const cloudState = vi.hoisted(() => ({
  uid: null as string | null,
  progress: {} as Record<string, CloudCourseProgress>,
  uploads: [] as Array<{ courseId: string; lessonId: string; videoKey: string; stat: unknown }>,
}));

vi.mock('./courseProgress/cloudSync', () => ({
  getSyncedUid: () => cloudState.uid,
  readCloudProgress: (courseId: string) => cloudState.progress[courseId],
  scheduleVideoStatUpload: (courseId: string, lessonId: string, videoKey: string, stat: unknown) => {
    cloudState.uploads.push({ courseId, lessonId, videoKey, stat });
  },
}));

import {
  getVideoStat,
  recordVideoOpenedExternally,
  recordVideoPlayback,
} from './courseVideoStats';

const play = (startSec: number, endSec: number, durationSec = 100) =>
  recordVideoPlayback('development', 'infancy', 'vid00000001', { startSec, endSec, durationSec });

describe('courseVideoStats', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cloudState.uid = 'student-1';
    cloudState.progress = {};
    cloudState.uploads = [];
  });

  it('видео просмотрено, когда реально проиграно 60% длительности', () => {
    expect(play(0, 59).watched).toBeUndefined();
    const stat = play(59, 60);
    expect(stat.watched).toBe(true);
    expect(stat.spans).toEqual([0, 60]);
    expect(stat.duration).toBe(100);
  });

  it('пересмотр одного куска не засчитывает просмотр', () => {
    play(0, 30);
    play(0, 30);
    play(10, 30);
    expect(getVideoStat('development', 'infancy', 'vid00000001').watched).toBeUndefined();
  });

  it('после «просмотрено» отрезки больше не пишутся', () => {
    play(0, 70);
    const uploadsAfterWatched = cloudState.uploads.length;
    play(70, 90);
    expect(cloudState.uploads).toHaveLength(uploadsAfterWatched);
  });

  it('копит просмотр между устройствами: облако + локальные отрезки', () => {
    cloudState.progress = {
      development: { videoStats: { infancy: { vid00000001: { spans: [0, 40], duration: 100 } } } },
    };
    const stat = play(40, 60);
    expect(stat.spans).toEqual([0, 60]);
    expect(stat.watched).toBe(true);
    expect(cloudState.uploads.at(-1)).toMatchObject({
      courseId: 'development',
      lessonId: 'infancy',
      videoKey: 'vid00000001',
    });
  });

  it('локальная статистика не переходит к другому пользователю браузера', () => {
    play(0, 50);
    cloudState.uid = 'student-2';
    expect(getVideoStat('development', 'infancy', 'vid00000001')).toEqual({});
  });

  it('переход на YouTube фиксируется один раз', () => {
    recordVideoOpenedExternally('development', 'infancy', 'vid00000001');
    recordVideoOpenedExternally('development', 'infancy', 'vid00000001');
    expect(getVideoStat('development', 'infancy', 'vid00000001').openedExternally).toBe(true);
    expect(cloudState.uploads).toHaveLength(1);
  });
});
