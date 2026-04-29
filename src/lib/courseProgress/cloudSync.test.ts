import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setDocMock = vi.fn().mockResolvedValue(undefined);
const onSnapshotMock = vi.fn();
const collectionMock = vi.fn((..._args: unknown[]) => ({ __collection: _args }));
const docMock = vi.fn((..._args: unknown[]) => ({ __doc: _args }));
const serverTimestampMock = vi.fn(() => '__ts__');

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  serverTimestamp: () => serverTimestampMock(),
  setDoc: (...args: unknown[]) => setDocMock(...args),
}));

vi.mock('../firebase', () => ({
  db: { __db: true },
}));

import {
  cleanupCourseProgressSync,
  initCourseProgressSync,
  readCloudProgress,
  scheduleLastLessonUpload,
  scheduleVideoResumeUpload,
  scheduleWatchedListUpload,
} from './cloudSync';
import { useCourseProgressStore } from '../../stores/useCourseProgressStore';

describe('courseProgress/cloudSync', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>;
  let snapshotCallback: ((snap: unknown) => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    setDocMock.mockClear();
    onSnapshotMock.mockReset();
    unsubscribeMock = vi.fn();
    snapshotCallback = null;
    onSnapshotMock.mockImplementation((_ref, onNext) => {
      snapshotCallback = onNext as (snap: unknown) => void;
      return unsubscribeMock;
    });
    useCourseProgressStore.getState().reset();
  });

  afterEach(() => {
    cleanupCourseProgressSync();
    vi.useRealTimers();
  });

  it('schedule is a no-op before init (guest)', () => {
    scheduleVideoResumeUpload('clinical', {
      videoId: 'v1',
      timeSec: 10,
      path: '/clinical/2',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('flushes pending writes after FLUSH_INTERVAL', async () => {
    initCourseProgressSync('user-1');
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);

    scheduleVideoResumeUpload('clinical', {
      videoId: 'v1',
      timeSec: 42,
      path: '/clinical/2',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    scheduleLastLessonUpload('clinical', {
      path: '/clinical/2',
      label: 'Лекция 2',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    expect(setDocMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(120_000);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload, opts] = setDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      videoResume: { videoId: 'v1', timeSec: 42 },
      lastLesson: { path: '/clinical/2', label: 'Лекция 2' },
      updatedAt: '__ts__',
    });
    expect(opts).toEqual({ merge: true });
  });

  it('coalesces multiple schedules into one write per course', async () => {
    initCourseProgressSync('user-1');

    for (let i = 0; i < 5; i += 1) {
      scheduleVideoResumeUpload('clinical', {
        videoId: 'v1',
        timeSec: 10 + i,
        path: '/clinical/2',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    }
    scheduleWatchedListUpload('clinical', ['l1', 'l2']);

    await vi.advanceTimersByTimeAsync(120_000);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0];
    expect(payload.videoResume.timeSec).toBe(14);
    expect(payload.watchedLessonIds).toEqual(['l1', 'l2']);
  });

  it('flushes immediately on visibilitychange to hidden', async () => {
    initCourseProgressSync('user-1');
    scheduleVideoResumeUpload('clinical', {
      videoId: 'v1',
      timeSec: 5,
      path: '/clinical/2',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.runOnlyPendingTimersAsync();

    expect(setDocMock).toHaveBeenCalledTimes(1);
  });

  it('hydrates store from snapshot and exposes via readCloudProgress', () => {
    initCourseProgressSync('user-1');
    expect(readCloudProgress('clinical')).toBeUndefined();

    snapshotCallback?.({
      forEach: (cb: (d: { id: string; data: () => unknown }) => void) => {
        cb({ id: 'clinical', data: () => ({ videoResume: { videoId: 'v1', timeSec: 7, path: '/x' } }) });
      },
    });

    expect(useCourseProgressStore.getState().hydrated).toBe(true);
    expect(readCloudProgress('clinical')?.videoResume?.timeSec).toBe(7);
  });

  it('cleanup unsubscribes and stops interval', () => {
    initCourseProgressSync('user-1');
    cleanupCourseProgressSync();
    expect(unsubscribeMock).toHaveBeenCalled();

    scheduleVideoResumeUpload('clinical', {
      videoId: 'v1',
      timeSec: 1,
      path: '/x',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    setDocMock.mockClear();
    vi.advanceTimersByTime(120_000);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
