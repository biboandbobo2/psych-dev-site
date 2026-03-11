import { useEffect, useMemo, useState } from 'react';
import {
  type VideoTranscriptSearchChunkDoc,
} from '../../../types/videoTranscripts';
import { debugError } from '../../../lib/debug';

const MIN_QUERY_LENGTH = 2;
const transcriptSearchChunksCache = new Map<string, VideoTranscriptSearchChunkDoc[]>();

async function fetchTranscriptSearchChunks(
  query: string,
  signal: AbortSignal
): Promise<VideoTranscriptSearchChunkDoc[]> {
  const params = new URLSearchParams({ q: query.trim() });
  const response = await fetch(`/api/transcript-search?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Transcript search request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    chunks?: VideoTranscriptSearchChunkDoc[];
  };
  return Array.isArray(payload.chunks) ? payload.chunks : [];
}

export function resetTranscriptSearchChunksCache() {
  transcriptSearchChunksCache.clear();
}

export function useTranscriptSearchChunks(enabled: boolean, query: string) {
  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);
  const shouldSearch = enabled && normalizedQuery.length >= MIN_QUERY_LENGTH;
  const [chunks, setChunks] = useState<VideoTranscriptSearchChunkDoc[]>(() => {
    if (!shouldSearch) {
      return [];
    }

    return transcriptSearchChunksCache.get(normalizedQuery) ?? [];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldSearch) {
      setChunks([]);
      setLoading(false);
      return;
    }

    const cachedChunks = transcriptSearchChunksCache.get(normalizedQuery);
    if (cachedChunks) {
      setChunks(cachedChunks);
      setLoading(false);
      return;
    }

    setChunks([]);
    const abortController = new AbortController();
    setLoading(true);

    fetchTranscriptSearchChunks(normalizedQuery, abortController.signal)
      .then((nextChunks) => {
        transcriptSearchChunksCache.set(normalizedQuery, nextChunks);
        setChunks(nextChunks);
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        debugError('[useTranscriptSearchChunks] Failed to load transcript search chunks', error);
        setChunks([]);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [normalizedQuery, shouldSearch]);

  return {
    chunks,
    loading,
  };
}
