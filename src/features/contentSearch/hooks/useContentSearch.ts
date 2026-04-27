import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Period } from '../../../types/content';
import type { Test } from '../../../types/tests';
import type { VideoTranscriptSearchChunkDoc } from '../../../types/videoTranscripts';
import type { ContentSearchState, CourseType, SearchResult } from '../types';
import {
  STOP_WORDS,
  searchInContent,
  searchInTests,
  searchInTranscript,
  type ContentSearchItem,
} from '../lib';

interface ContentData {
  periods: Period[];
  clinicalTopics: Map<string, Period>;
  generalTopics: Map<string, Period>;
  transcriptSearchChunks: VideoTranscriptSearchChunkDoc[];
}

interface UseContentSearchOptions {
  minQueryLength?: number;
}

/**
 * Простой клиентский поиск по контенту всех курсов и тестам.
 * Индексирует: title, subtitle, concepts, authors, literature, videos, leisure, тесты, транскрипты.
 */
export function useContentSearch(
  contentData: ContentData,
  tests: Test[] = [],
  options: UseContentSearchOptions = {},
) {
  const { minQueryLength = 2 } = options;
  const lastSearchSignatureRef = useRef<string | null>(null);
  const [state, setState] = useState<ContentSearchState>({
    status: 'idle',
    results: [],
    query: '',
  });

  const allContent = useMemo<ContentSearchItem[]>(() => {
    const items: ContentSearchItem[] = [];
    const pushPublished = (period: Period, course: CourseType) => {
      if (period.published !== false) items.push({ data: period, course });
    };
    contentData.periods.forEach((p) => pushPublished(p, 'development'));
    contentData.clinicalTopics.forEach((p) => pushPublished(p, 'clinical'));
    contentData.generalTopics.forEach((p) => pushPublished(p, 'general'));
    return items;
  }, [contentData.periods, contentData.clinicalTopics, contentData.generalTopics]);

  const dataSignature = useMemo(
    () => `${allContent.length}:${tests.length}:${contentData.transcriptSearchChunks.length}`,
    [allContent.length, contentData.transcriptSearchChunks.length, tests.length],
  );

  const search = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim().toLowerCase();
      lastSearchSignatureRef.current = `${trimmedQuery}::${dataSignature}`;

      if (trimmedQuery.length < minQueryLength) {
        setState({ status: 'idle', results: [], query });
        return;
      }

      setState((prev) => ({ ...prev, status: 'searching', query }));

      const queryWords = trimmedQuery
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

      if (queryWords.length === 0) {
        setState({ status: 'success', results: [], query });
        return;
      }

      const contentResults = searchInContent(allContent, queryWords);
      contentResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const testResults = searchInTests(tests, queryWords);
      testResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const transcriptResults = searchInTranscript(
        contentData.transcriptSearchChunks,
        queryWords,
        query,
      );

      const allResults: SearchResult[] = [...contentResults, ...transcriptResults, ...testResults];
      setState({ status: 'success', results: allResults, query });
    },
    [allContent, contentData.transcriptSearchChunks, dataSignature, tests, minQueryLength],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', results: [], query: '' });
  }, []);

  useEffect(() => {
    if (state.status === 'idle' || state.query.trim().length < minQueryLength) return;

    const expectedSignature = `${state.query.trim().toLowerCase()}::${dataSignature}`;
    if (lastSearchSignatureRef.current === expectedSignature) return;

    search(state.query);
  }, [dataSignature, minQueryLength, search, state.query, state.status]);

  return {
    state,
    search,
    reset,
    hasResults: state.results.length > 0,
    isReady: allContent.length > 0,
  };
}
