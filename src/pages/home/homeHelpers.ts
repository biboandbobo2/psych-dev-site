import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, ROUTE_CONFIG } from '../../routes';
import type { CourseType } from '../../types/tests';
import type { Group } from '../../types/groups';

export const MAX_CONTINUE_CARDS = 3;

export function resolvePrimaryLesson(courseId: string): { link: string; title: string } {
  if (courseId === 'development') {
    return {
      link: ROUTE_CONFIG[0]?.path ?? '/profile?course=development',
      title: ROUTE_CONFIG[0]?.navLabel ?? 'Вводное занятие',
    };
  }
  if (courseId === 'clinical') {
    return {
      link: CLINICAL_ROUTE_CONFIG[0]?.path ?? '/profile?course=clinical',
      title: CLINICAL_ROUTE_CONFIG[0]?.navLabel ?? 'Введение',
    };
  }
  if (courseId === 'general') {
    return {
      link: GENERAL_ROUTE_CONFIG[0]?.path ?? '/profile?course=general',
      title: GENERAL_ROUTE_CONFIG[0]?.navLabel ?? 'Первое занятие курса',
    };
  }
  return {
    link: `/profile?course=${encodeURIComponent(courseId as CourseType)}`,
    title: 'Первое занятие выбранного курса',
  };
}

export function getEstimatedCourseLessons(courseId: string): number {
  if (courseId === 'development') return ROUTE_CONFIG.length;
  if (courseId === 'clinical') return CLINICAL_ROUTE_CONFIG.length;
  if (courseId === 'general') return GENERAL_ROUTE_CONFIG.length;
  return 0;
}

const RU_MONTH_INDEX: Record<string, number> = {
  январ: 0,
  феврал: 1,
  март: 2,
  апрел: 3,
  ма: 4,
  июн: 5,
  июл: 6,
  август: 7,
  сентябр: 8,
  октябр: 9,
  ноябр: 10,
  декабр: 11,
};

export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export type ParsedCalendarEvent = {
  id: string;
  text: string;
  dateLabel: string;
  dateKey: string | null;
  parsedDate: Date | null;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatTimeFromSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(secs)}`;
  }
  return `${minutes}:${pad2(secs)}`;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDateKey(dateKey: string): string {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export type ContinueCoursesSource = 'user' | 'group' | 'lastWatched' | 'empty';

export interface ResolvedContinueCourses {
  ids: string[];
  source: ContinueCoursesSource;
}

/**
 * Чистая функция выбора continue-cards для /home.
 *
 * Приоритет, сверху вниз:
 *  1) `userFeaturedCourseIds` — личные «актуальные» курсы пользователя
 *     (фильтруются по accessibleCourseIds, max 3).
 *  2) Объединённые `featuredCourseIds` всех групп пользователя в порядке
 *     `groups` (max 3, дедуп; фильтр по accessibleCourseIds).
 *  3) `lastWatchedCourseId` — последний просмотренный (даже если не отмечен
 *     как featured); должен принадлежать accessibleCourseIds.
 *  4) `empty` — пустой список (UI показывает CTA-заглушку).
 */
export function resolveContinueCourses(params: {
  userFeaturedCourseIds: string[];
  groups: Pick<Group, 'featuredCourseIds'>[];
  lastWatchedCourseId: string | null;
  accessibleCourseIds: string[];
}): ResolvedContinueCourses {
  const { userFeaturedCourseIds, groups, lastWatchedCourseId, accessibleCourseIds } = params;
  const accessible = new Set(accessibleCourseIds);

  const filterAccessibleUnique = (ids: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      if (!accessible.has(id)) continue;
      seen.add(id);
      result.push(id);
      if (result.length >= MAX_CONTINUE_CARDS) break;
    }
    return result;
  };

  const userPicks = filterAccessibleUnique(userFeaturedCourseIds);
  if (userPicks.length > 0) {
    return { ids: userPicks, source: 'user' };
  }

  const groupIds: string[] = [];
  for (const group of groups) {
    if (Array.isArray(group.featuredCourseIds)) {
      groupIds.push(...group.featuredCourseIds);
    }
  }
  const groupPicks = filterAccessibleUnique(groupIds);
  if (groupPicks.length > 0) {
    return { ids: groupPicks, source: 'group' };
  }

  if (lastWatchedCourseId && accessible.has(lastWatchedCourseId)) {
    return { ids: [lastWatchedCourseId], source: 'lastWatched' };
  }

  return { ids: [], source: 'empty' };
}

export function tryParseDateLabel(dateLabel: string): Date | null {
  const normalized = dateLabel.trim().toLowerCase();
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return new Date(year, month, day);
  }

  const dotMatch = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dotMatch) {
    const day = Number(dotMatch[1]);
    const month = Number(dotMatch[2]) - 1;
    const year = Number(dotMatch[3]);
    return new Date(year, month, day);
  }

  const dayMonthYear = normalized.match(/^(\d{1,2})\s+([а-яёa-z]+)\s+(\d{4})$/i);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const monthWord = dayMonthYear[2];
    const year = Number(dayMonthYear[3]);
    const month = Object.entries(RU_MONTH_INDEX).find(([prefix]) => monthWord.startsWith(prefix))?.[1];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  const monthYear = normalized.match(/^([а-яёa-z]+)\s+(\d{4})$/i);
  if (monthYear) {
    const monthWord = monthYear[1];
    const year = Number(monthYear[2]);
    const month = Object.entries(RU_MONTH_INDEX).find(([prefix]) => monthWord.startsWith(prefix))?.[1];
    if (month !== undefined) {
      return new Date(year, month, 1);
    }
  }

  const parsedNative = new Date(dateLabel);
  if (!Number.isNaN(parsedNative.getTime())) {
    return new Date(parsedNative.getFullYear(), parsedNative.getMonth(), parsedNative.getDate());
  }

  return null;
}
