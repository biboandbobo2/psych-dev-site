import { useState, useCallback, useMemo } from 'react';
import type { Period, Author, ContentLink } from '../../../types/content';
import type { SearchResult, CourseType, MatchField, ContentSearchState } from '../types';

interface ContentData {
  periods: Period[];
  clinicalTopics: Map<string, Period>;
  generalTopics: Map<string, Period>;
}

interface UseContentSearchOptions {
  minQueryLength?: number;
}

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
 * Простой клиентский поиск по контенту всех курсов
 * Индексирует: title, subtitle, concepts, authors, literature
 */
export function useContentSearch(
  contentData: ContentData,
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
      const queryWords = trimmedQuery.split(/\s+/).filter((w) => w.length >= 2);

      const results: SearchResult[] = [];

      for (const item of allContent) {
        const { data, course } = item;
        const matchedIn: MatchField[] = [];
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

        // Поиск в concepts (sections или legacy)
        const concepts = extractSectionData<string>(data, 'concepts', 'concepts');
        if (concepts.some((c) => matchesQuery(c, queryWords))) {
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

        if (matchedIn.length > 0) {
          results.push({
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

      // Сортируем по релевантности
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      setState({ status: 'success', results, query });
    },
    [allContent, minQueryLength]
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

/**
 * Проверяет, содержит ли текст все слова из запроса
 */
function matchesQuery(text: string | undefined, queryWords: string[]): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return queryWords.some((word) => lowerText.includes(word));
}
