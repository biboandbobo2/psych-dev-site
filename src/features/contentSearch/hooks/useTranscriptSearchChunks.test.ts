import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTranscriptSearchChunksCache, useTranscriptSearchChunks } from './useTranscriptSearchChunks';

describe('useTranscriptSearchChunks', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetTranscriptSearchChunksCache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('не делает запрос для слишком короткого query', () => {
    const { result } = renderHook(() => useTranscriptSearchChunks(true, 'я'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.chunks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('загружает только чанки по текущему запросу и кеширует их', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        chunks: [
          {
            youtubeVideoId: 'video-1',
            referenceKey: 'development::intro::0',
            courseId: 'development',
            periodId: 'intro',
            periodTitle: 'Введение',
            lectureTitle: 'Вступительная лекция',
            sourcePath: 'intro/singleton',
            sourceUrl: 'https://www.youtube.com/watch?v=video-1',
            chunkIndex: 0,
            startMs: 1000,
            endMs: 2000,
            timestampLabel: '00:01',
            segmentCount: 2,
            text: 'Память развивается в деятельности',
            normalizedText: 'память развивается в деятельности',
            updatedAt: new Date().toISOString(),
            version: 1,
          },
        ],
      }),
    });

    const { result, rerender } = renderHook(
      ({ query }) => useTranscriptSearchChunks(true, query),
      { initialProps: { query: 'память' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.chunks).toHaveLength(1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/transcript-search?q=%D0%BF%D0%B0%D0%BC%D1%8F%D1%82%D1%8C');

    rerender({ query: 'память' });
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
