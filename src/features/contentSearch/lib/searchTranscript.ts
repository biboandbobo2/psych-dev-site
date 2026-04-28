import { buildCourseLessonPath } from '../../../lib/courseLessonPaths';
import type { VideoTranscriptSearchChunkDoc } from '../../../types/videoTranscripts';
import type { CourseType, TranscriptSearchResult } from '../types';
import { countMatches, matchesQuery } from './textMatch';

interface TranscriptMatch {
  youtubeVideoId: string;
  period: string;
  periodTitle: string;
  lectureTitle: string;
  course: CourseType;
  relevanceScore: number;
  startMs: number;
  timestampLabel: string;
  snippet: string;
  path: string;
  referenceKey: string;
}

export function buildTranscriptSearchPath(
  result: VideoTranscriptSearchChunkDoc,
  query: string,
): string {
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

function compareByScoreThenStart(
  a: { relevanceScore: number; startMs: number },
  b: { relevanceScore: number; startMs: number },
): number {
  if (b.relevanceScore !== a.relevanceScore) {
    return b.relevanceScore - a.relevanceScore;
  }
  return a.startMs - b.startMs;
}

/**
 * Поиск по чанкам транскриптов. Группирует результаты по referenceKey
 * (одна лекция = один result), внутри держит timestamps на каждый чанк.
 */
export function searchInTranscript(
  transcriptSearchChunks: readonly VideoTranscriptSearchChunkDoc[],
  queryWords: string[],
  rawQuery: string,
): TranscriptSearchResult[] {
  const matches: TranscriptMatch[] = transcriptSearchChunks
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
    }))
    .sort(compareByScoreThenStart);

  const grouped = new Map<string, TranscriptSearchResult & { _seenStarts: Set<number> }>();

  for (const match of matches) {
    const existing = grouped.get(match.referenceKey);
    if (!existing) {
      grouped.set(match.referenceKey, {
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
          { path: match.path, startMs: match.startMs, timestampLabel: match.timestampLabel },
        ],
        _seenStarts: new Set([match.startMs]),
      });
      continue;
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
  }

  return [...grouped.values()]
    .map(({ _seenStarts: _drop, ...result }) => ({
      ...result,
      timestamps: result.timestamps.sort((a, b) => a.startMs - b.startMs),
    }))
    .sort(compareByScoreThenStart);
}
