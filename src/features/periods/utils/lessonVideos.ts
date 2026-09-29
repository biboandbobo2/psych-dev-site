import { getYouTubeVideoId } from '../../../lib/videoTranscripts';
import type { Period } from '../../../types/content';
import { normalizeVideoEntry } from './media';

// Фиксированный порядок отображения секций занятия
const SECTION_ORDER = [
  'video',
  'video_section',
  'concepts',
  'authors',
  'core_literature',
  'extra_literature',
  'extra_videos',
  'leisure',
  'self_questions',
];

/** Секции в порядке показа; slug вне SECTION_ORDER — в конец, в исходном порядке. */
export function sortLessonSections<T>(sections: Record<string, T>): Array<[string, T]> {
  const orderOf = (slug: string) => {
    const index = SECTION_ORDER.indexOf(slug);
    return index === -1 ? SECTION_ORDER.length : index;
  };
  return Object.entries(sections).sort(([slugA], [slugB]) => orderOf(slugA) - orderOf(slugB));
}

/** Секция с основными видео занятия. «Дополнительные видео» сюда не входят. */
export function isMainVideoSection(title: string | undefined): boolean {
  return title === 'Видео-лекция' || title === 'Видео';
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Ключ видео в статистике просмотров: id YouTube, а для прочих ссылок —
 * хэш URL (точки и слеши URL неудобны как ключ map в Firestore).
 */
export function getLessonVideoKey(entry: unknown): string | null {
  const { embedUrl, originalUrl } = normalizeVideoEntry(entry);
  const youtubeId = getYouTubeVideoId(originalUrl) ?? getYouTubeVideoId(embedUrl);
  if (youtubeId) return youtubeId;
  const url = originalUrl.trim();
  return url ? `url-${hashString(url)}` : null;
}

type LessonSections = Record<string, { title?: string; content?: unknown[] } | undefined>;

/** Ключи основных видео занятия в порядке показа; первый — главная лекция. */
export function collectLessonVideoKeys(sections: LessonSections | null | undefined): string[] {
  if (!sections) return [];
  const keys: string[] = [];
  for (const [, section] of sortLessonSections(sections)) {
    if (!section || !isMainVideoSection(section.title) || !Array.isArray(section.content)) continue;
    for (const entry of section.content) {
      const key = getLessonVideoKey(entry);
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

/**
 * То же по сырому документу занятия: секции, а у старых документов —
 * video_playlist / video_url (как их показывают PeriodPage и usePeriods).
 */
export function collectLessonDocVideoKeys(lesson: Partial<Period>): string[] {
  if (lesson.sections && Object.keys(lesson.sections).length > 0) {
    return collectLessonVideoKeys(lesson.sections as LessonSections);
  }
  const playlist = Array.isArray(lesson.video_playlist) ? lesson.video_playlist : [];
  const videoUrl = typeof lesson.video_url === 'string' ? lesson.video_url.trim() : '';
  const content = playlist.length > 0 ? playlist : videoUrl ? [videoUrl] : [];
  return collectLessonVideoKeys({ video: { title: 'Видео-лекция', content } });
}
