import { useState, useCallback, useMemo } from 'react';
import type { Period, Author, ContentLink } from '../../../types/content';
import type { Test } from '../../../types/tests';
import type { VideoTranscriptSearchChunkDoc } from '../../../types/videoTranscripts';
import { buildCourseLessonPath } from '../../../lib/courseLessons';
import type {
  SearchResult,
  ContentSearchResult,
  TestSearchResult,
  TranscriptSearchResult,
  CourseType,
  ContentMatchField,
  TestMatchField,
  ContentSearchState,
} from '../types';

interface ContentData {
  periods: Period[];
  clinicalTopics: Map<string, Period>;
  generalTopics: Map<string, Period>;
  transcriptSearchChunks: VideoTranscriptSearchChunkDoc[];
}

interface UseContentSearchOptions {
  minQueryLength?: number;
}

// Стоп-слова для фильтрации
const STOP_WORDS = new Set([
  // English
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its',
  // Russian
  'и', 'в', 'на', 'с', 'по', 'для', 'из', 'к', 'о', 'об', 'от', 'до', 'за', 'при', 'во', 'не', 'как', 'что', 'это', 'или', 'но', 'а', 'же', 'ли', 'бы', 'его', 'её', 'их', 'то', 'все', 'вся', 'всё',
]);

/**
 * Извлекает данные из sections или legacy полей
 * Данные могут быть в period.sections.X.content или в period.X
 */
function extractSectionData<T>(
  period: Period,
  sectionKey: string,
  legacyKey: keyof Period
): T[] {
  // Сначала проверяем sections (новый формат после миграции)
  const sectionData = period.sections?.[sectionKey]?.content;
  if (Array.isArray(sectionData) && sectionData.length > 0) {
    return sectionData as T[];
  }
  // Fallback на legacy поля
  const legacyData = period[legacyKey];
  if (Array.isArray(legacyData)) {
    return legacyData as T[];
  }
  return [];
}

/**
 * Проверяет, содержит ли текст слова из запроса
 * Для одного слова — достаточно его наличия
 * Для нескольких слов — требуется совпадение всех слов
 */
function matchesQuery(text: string | undefined, queryWords: string[]): boolean {
  if (!text || queryWords.length === 0) return false;
  const lowerText = text.toLowerCase();

  // Для одного слова — ищем его вхождение
  if (queryWords.length === 1) {
    return lowerText.includes(queryWords[0]);
  }

  // Для нескольких слов — требуем наличия всех слов
  return queryWords.every((word) => lowerText.includes(word));
}

/**
 * Поиск по контенту периодов/тем
 */
function searchInContent(
  allContent: Array<{ data: Period; course: CourseType }>,
  queryWords: string[]
): ContentSearchResult[] {
  const results: ContentSearchResult[] = [];

  for (const item of allContent) {
    const { data, course } = item;
    const matchedIn: ContentMatchField[] = [];
    let score = 0;

    // Поиск в title (высокий приоритет)
    if (matchesQuery(data.title, queryWords)) {
      matchedIn.push('title');
      score += 10;
    }

    // Поиск в subtitle
    if (matchesQuery(data.subtitle, queryWords)) {
      matchedIn.push('subtitle');
      score += 5;
    }

    // Поиск в concepts (sections или legacy, поддержка string и { name })
    const concepts = extractSectionData<string | { name: string }>(data, 'concepts', 'concepts');
    if (concepts.some((c) => matchesQuery(typeof c === 'string' ? c : c.name, queryWords))) {
      matchedIn.push('concepts');
      score += 8;
    }

    // Поиск в authors (sections или legacy)
    const authors = extractSectionData<Author>(data, 'authors', 'authors');
    if (authors.some((a) => matchesQuery(a.name, queryWords))) {
      matchedIn.push('authors');
      score += 6;
    }

    // Поиск в литературе (sections или legacy)
    const coreLit = extractSectionData<ContentLink>(data, 'core_literature', 'core_literature');
    const extraLit = extractSectionData<ContentLink>(data, 'extra_literature', 'extra_literature');
    const allLiterature = [...coreLit, ...extraLit];
    if (allLiterature.some((l) => matchesQuery(l.title, queryWords))) {
      matchedIn.push('literature');
      score += 4;
    }

    // Поиск в дополнительных видео (sections или legacy)
    const extraVideos = extractSectionData<ContentLink>(data, 'extra_videos', 'extra_videos');
    const videoPlaylist = data.video_playlist || [];
    const allVideos = [
      ...extraVideos,
      ...videoPlaylist.filter((v): v is { title: string; url?: string } => !!v.title),
    ];
    if (allVideos.some((v) => matchesQuery(v.title, queryWords))) {
      matchedIn.push('videos');
      score += 4;
    }

    // Поиск в досуге (sections или legacy)
    const leisure = extractSectionData<{ title: string; url?: string }>(data, 'leisure', 'leisure');
    if (leisure.some((l) => matchesQuery(l.title, queryWords))) {
      matchedIn.push('leisure');
      score += 3;
    }

    if (matchedIn.length > 0) {
      results.push({
        type: 'content',
        id: `${course}-${data.period}`,
        period: data.period,
        title: data.title,
        subtitle: data.subtitle,
        course,
        matchedIn,
        relevanceScore: score,
      });
    }
  }

  return results;
}

/**
 * Поиск по тестам
 */
function searchInTests(tests: Test[], queryWords: string[]): TestSearchResult[] {
  const results: TestSearchResult[] = [];

  for (const test of tests) {
    if (test.status !== 'published') continue;

    const matchedIn: TestMatchField[] = [];
    let score = 0;

    // Поиск в названии теста
    if (matchesQuery(test.title, queryWords)) {
      matchedIn.push('testTitle');
      score += 10;
    }

    // Поиск в вопросах
    for (const question of test.questions) {
      // Текст вопроса
      if (matchesQuery(question.questionText, queryWords)) {
        if (!matchedIn.includes('question')) {
          matchedIn.push('question');
          score += 7;
        }
      }

      // Варианты ответов
      for (const answer of question.answers) {
        if (matchesQuery(answer.text, queryWords)) {
          if (!matchedIn.includes('answer')) {
            matchedIn.push('answer');
            score += 5;
          }
        }
      }

      // Объяснение
      if (matchesQuery(question.explanation, queryWords)) {
        if (!matchedIn.includes('explanation')) {
          matchedIn.push('explanation');
          score += 4;
        }
      }
    }

    if (matchedIn.length > 0) {
      results.push({
        type: 'test',
        id: `test-${test.id}`,
        testId: test.id,
        title: test.title,
        course: test.course,
        matchedIn,
        relevanceScore: score,
        icon: test.appearance?.introIcon || test.appearance?.badgeIcon,
      });
    }
  }

  return results;
}

function countMatches(text: string, queryWords: string[]) {
  return queryWords.reduce((count, word) => {
    const matches = text.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return count + (matches?.length ?? 0);
  }, 0);
}

function buildTranscriptSearchPath(result: VideoTranscriptSearchChunkDoc, query: string) {
  const basePath = buildCourseLessonPath(result.courseId, result.periodId);
  const params = new URLSearchParams({
    panel: 'transcript',
    study: '1',
    t: String(Math.floor(result.startMs / 1000)),
    video: result.youtubeVideoId,
  });

  if (query.trim()) {
    params.set('q', query.trim());
  }

  return `${basePath}?${params.toString()}`;
}

function searchInTranscript(
  transcriptSearchChunks: VideoTranscriptSearchChunkDoc[],
  queryWords: string[],
  rawQuery: string
): TranscriptSearchResult[] {
  const matches = transcriptSearchChunks
    .filter((chunk) => matchesQuery(chunk.normalizedText, queryWords))
    .map((chunk) => ({
      youtubeVideoId: chunk.youtubeVideoId,
      period: chunk.periodId,
      periodTitle: chunk.periodTitle,
      lectureTitle: chunk.lectureTitle,
      course: chunk.courseId as CourseType,
      relevanceScore: 6 + countMatches(chunk.normalizedText, queryWords),
      startMs: chunk.startMs,
      timestampLabel: chunk.timestampLabel,
      snippet: chunk.text,
      path: buildTranscriptSearchPath(chunk, rawQuery),
      referenceKey: chunk.referenceKey,
      matchedIn: ['transcript'] as ['transcript'],
      title: chunk.lectureTitle,
    }))
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      return a.startMs - b.startMs;
    });

  const groupedResults = new Map<
    string,
    TranscriptSearchResult & {
      _seenStarts: Set<number>;
    }
  >();

  matches.forEach((match) => {
    const existing = groupedResults.get(match.referenceKey);
    if (!existing) {
      groupedResults.set(match.referenceKey, {
        type: 'transcript',
        id: match.referenceKey,
        youtubeVideoId: match.youtubeVideoId,
        title: match.lectureTitle,
        period: match.period,
        periodTitle: match.periodTitle,
        lectureTitle: match.lectureTitle,
        course: match.course,
        matchedIn: ['transcript'],
        relevanceScore: match.relevanceScore,
        startMs: match.startMs,
        snippet: match.snippet,
        path: match.path,
        timestamps: [
          {
            path: match.path,
            startMs: match.startMs,
            timestampLabel: match.timestampLabel,
          },
        ],
        _seenStarts: new Set([match.startMs]),
      });
      return;
    }

    existing.relevanceScore += match.relevanceScore;
    if (!existing._seenStarts.has(match.startMs)) {
      existing._seenStarts.add(match.startMs);
      existing.timestamps.push({
        path: match.path,
        startMs: match.startMs,
        timestampLabel: match.timestampLabel,
      });
    }
  });

  return [...groupedResults.values()]
    .map(({ _seenStarts, ...result }) => ({
      ...result,
      timestamps: result.timestamps.sort((a, b) => a.startMs - b.startMs),
    }))
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      return a.startMs - b.startMs;
    });
}

/**
 * Простой клиентский поиск по контенту всех курсов и тестам
 * Индексирует: title, subtitle, concepts, authors, literature, videos, leisure, тесты
 */
export function useContentSearch(
  contentData: ContentData,
  tests: Test[] = [],
  options: UseContentSearchOptions = {}
) {
  const { minQueryLength = 2 } = options;
  const [state, setState] = useState<ContentSearchState>({
    status: 'idle',
    results: [],
    query: '',
  });

  // Преобразуем все данные в единый массив для поиска
  const allContent = useMemo(() => {
    const items: Array<{ data: Period; course: CourseType }> = [];

    // Периоды развития
    contentData.periods.forEach((period) => {
      if (period.published !== false) {
        items.push({ data: period, course: 'development' });
      }
    });

    // Клинические темы
    contentData.clinicalTopics.forEach((topic) => {
      if (topic.published !== false) {
        items.push({ data: topic, course: 'clinical' });
      }
    });

    // Общие темы
    contentData.generalTopics.forEach((topic) => {
      if (topic.published !== false) {
        items.push({ data: topic, course: 'general' });
      }
    });

    return items;
  }, [contentData.periods, contentData.clinicalTopics, contentData.generalTopics]);

  const search = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim().toLowerCase();

      if (trimmedQuery.length < minQueryLength) {
        setState({ status: 'idle', results: [], query });
        return;
      }

      setState((prev) => ({ ...prev, status: 'searching', query }));

      // Разбиваем запрос на слова для более гибкого поиска
      const queryWords = trimmedQuery
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

      // Если после фильтрации не осталось значимых слов
      if (queryWords.length === 0) {
        setState({ status: 'success', results: [], query });
        return;
      }

      // Поиск по контенту
      const contentResults = searchInContent(allContent, queryWords);
      contentResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Поиск по тестам
      const testResults = searchInTests(tests, queryWords);
      testResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const transcriptResults = searchInTranscript(
        contentData.transcriptSearchChunks,
        queryWords,
        query
      );

      // Контент сначала, затем transcript, потом тесты
      const allResults: SearchResult[] = [...contentResults, ...transcriptResults, ...testResults];

      setState({ status: 'success', results: allResults, query });
    },
    [allContent, contentData.transcriptSearchChunks, tests, minQueryLength]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', results: [], query: '' });
  }, []);

  return {
    state,
    search,
    reset,
    hasResults: state.results.length > 0,
    isReady: allContent.length > 0,
  };
}
