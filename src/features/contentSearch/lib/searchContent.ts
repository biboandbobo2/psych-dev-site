import type { Author, ContentLink, Period } from '../../../types/content';
import type { ContentMatchField, ContentSearchResult, CourseType } from '../types';
import { extractSectionData, matchesQuery } from './textMatch';

export interface ContentSearchItem {
  data: Period;
  course: CourseType;
}

/**
 * Поиск по периодам / темам всех курсов.
 *
 * Scoring:
 *   title 10, concepts 8, authors 6, subtitle 5, literature 4, videos 4, leisure 3.
 */
export function searchInContent(
  allContent: readonly ContentSearchItem[],
  queryWords: string[],
): ContentSearchResult[] {
  const results: ContentSearchResult[] = [];

  for (const { data, course } of allContent) {
    const matchedIn: ContentMatchField[] = [];
    let score = 0;

    if (matchesQuery(data.title, queryWords)) {
      matchedIn.push('title');
      score += 10;
    }

    if (matchesQuery(data.subtitle, queryWords)) {
      matchedIn.push('subtitle');
      score += 5;
    }

    const concepts = extractSectionData<string | { name: string }>(data, 'concepts', 'concepts');
    if (concepts.some((c) => matchesQuery(typeof c === 'string' ? c : c.name, queryWords))) {
      matchedIn.push('concepts');
      score += 8;
    }

    const authors = extractSectionData<Author>(data, 'authors', 'authors');
    if (authors.some((a) => matchesQuery(a.name, queryWords))) {
      matchedIn.push('authors');
      score += 6;
    }

    const coreLit = extractSectionData<ContentLink>(data, 'core_literature', 'core_literature');
    const extraLit = extractSectionData<ContentLink>(data, 'extra_literature', 'extra_literature');
    if ([...coreLit, ...extraLit].some((l) => matchesQuery(l.title, queryWords))) {
      matchedIn.push('literature');
      score += 4;
    }

    const extraVideos = extractSectionData<ContentLink>(data, 'extra_videos', 'extra_videos');
    const videoPlaylist = data.video_playlist ?? [];
    const allVideos = [
      ...extraVideos,
      ...videoPlaylist.filter((v): v is { title: string; url?: string } => !!v.title),
    ];
    if (allVideos.some((v) => matchesQuery(v.title, queryWords))) {
      matchedIn.push('videos');
      score += 4;
    }

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
