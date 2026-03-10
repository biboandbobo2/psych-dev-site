import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useContentSearch } from './useContentSearch';

describe('useContentSearch transcript results', () => {
  it('агрегирует несколько совпадений одной лекции в один transcript result', () => {
    const { result } = renderHook(() =>
      useContentSearch(
        {
          periods: [],
          clinicalTopics: new Map(),
          generalTopics: new Map(),
          transcriptSearchChunks: [
            {
              youtubeVideoId: 'dQw4w9WgXcQ',
              referenceKey: 'development::intro::0',
              courseId: 'development',
              periodId: 'intro',
              periodTitle: 'Введение',
              lectureTitle: 'Вступительная лекция',
              sourcePath: 'intro/singleton',
              sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              chunkIndex: 0,
              startMs: 65_000,
              endMs: 80_000,
              timestampLabel: '01:05',
              segmentCount: 2,
              text: 'Развитие связано с переживанием времени',
              normalizedText: 'развитие связано с переживанием времени',
              updatedAt: new Date() as never,
              version: 1,
            },
            {
              youtubeVideoId: 'dQw4w9WgXcQ',
              referenceKey: 'development::intro::0',
              courseId: 'development',
              periodId: 'intro',
              periodTitle: 'Введение',
              lectureTitle: 'Вступительная лекция',
              sourcePath: 'intro/singleton',
              sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              chunkIndex: 1,
              startMs: 125_000,
              endMs: 138_000,
              timestampLabel: '02:05',
              segmentCount: 2,
              text: 'Время и развитие обсуждаются повторно',
              normalizedText: 'время и развитие обсуждаются повторно',
              updatedAt: new Date() as never,
              version: 1,
            },
          ],
        },
        []
      )
    );

    act(() => {
      result.current.search('развитие');
    });

    expect(result.current.state.status).toBe('success');
    expect(result.current.state.results).toHaveLength(1);
    expect(result.current.state.results[0]).toMatchObject({
      type: 'transcript',
      title: 'Вступительная лекция',
      periodTitle: 'Введение',
    });

    const transcriptResult = result.current.state.results[0];
    if (transcriptResult.type !== 'transcript') {
      throw new Error('Expected transcript result');
    }

    expect(transcriptResult.path).toContain('/intro?');
    expect(transcriptResult.path).toContain('study=1');
    expect(transcriptResult.path).toContain('panel=transcript');
    expect(transcriptResult.path).toContain('video=dQw4w9WgXcQ');
    expect(transcriptResult.path).toContain('t=65');
    expect(transcriptResult.timestamps).toEqual([
      expect.objectContaining({ startMs: 65_000, timestampLabel: '01:05' }),
      expect.objectContaining({ startMs: 125_000, timestampLabel: '02:05' }),
    ]);
  });
});
