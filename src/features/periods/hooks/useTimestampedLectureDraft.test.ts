import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTimestampedLectureDraft } from './useTimestampedLectureDraft';

describe('useTimestampedLectureDraft', () => {
  it('фиксирует таймкод в момент начала записи', () => {
    const { result } = renderHook(() =>
      useTimestampedLectureDraft({
        getPlaybackSnapshot: () => ({
          currentTimeMs: 317000,
          paused: false,
        }),
        initialSegments: [],
      })
    );

    act(() => {
      result.current.updateComposerText('Первый тезис');
    });

    expect(result.current.composer.startMs).toBe(317000);
  });

  it('не создаёт новый сегмент до истечения порога тишины', async () => {
    const { result } = renderHook(() =>
      useTimestampedLectureDraft({
        getPlaybackSnapshot: () => ({
          currentTimeMs: 100000,
          paused: false,
        }),
        idleThresholdMs: 40,
        initialSegments: [],
      })
    );

    act(() => {
      result.current.updateComposerText('Первый тезис');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    act(() => {
      result.current.updateComposerText('Первый тезис и уточнение');
    });

    expect(result.current.persistedSegments).toHaveLength(1);
    expect(result.current.segments).toHaveLength(0);
    expect(result.current.composer.text).toBe('Первый тезис и уточнение');
  });

  it('финализирует сегмент после порога бездействия и начинает новый', async () => {
    let currentTimeMs = 100000;
    const { result } = renderHook(() =>
      useTimestampedLectureDraft({
        getPlaybackSnapshot: () => ({
          currentTimeMs,
          paused: false,
        }),
        idleThresholdMs: 30,
        initialSegments: [],
      })
    );

    act(() => {
      result.current.updateComposerText('Первый тезис');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    expect(result.current.segments).toHaveLength(1);
    expect(result.current.composer.text).toBe('');

    currentTimeMs = 150000;

    act(() => {
      result.current.updateComposerText('Второй тезис');
    });

    expect(result.current.persistedSegments).toHaveLength(2);
    expect(result.current.persistedSegments[1]).toEqual(
      expect.objectContaining({
        startMs: 150000,
        text: 'Второй тезис',
      })
    );
  });
});
