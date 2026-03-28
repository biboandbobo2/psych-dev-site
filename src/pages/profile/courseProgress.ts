import { getCoreCourseRoutes } from '../../lib/courseLessons';
import { isCoreCourse } from '../../constants/courses';

export interface ProgressLessonItem {
  period: string;
  label?: string;
  title?: string;
}

export interface CourseProgressStats {
  percent: number;
  completed: number;
  total: number;
}

interface ResolveCourseProgressInput {
  courseId: string;
  lessons: ProgressLessonItem[];
  lastPath?: string;
  lastLabel?: string;
}

const normalizeText = (value?: string): string => (typeof value === 'string' ? value.trim() : '');

const normalizePath = (path?: string): string => {
  if (!path) return '';
  const [rawPath] = path.split('?');
  const trimmed = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
  return decodeURIComponent(trimmed);
};

function resolveLessonIdFromPath(courseId: string, rawPath?: string): string {
  const path = normalizePath(rawPath);
  if (!path) return '';

  if (isCoreCourse(courseId)) {
    const routes = getCoreCourseRoutes(courseId);
    const matchedRoute = routes.find((route) => normalizePath(route.path) === path);
    return matchedRoute?.periodId ?? '';
  }

  const prefix = `/course/${encodeURIComponent(courseId)}/`;
  if (!path.startsWith(prefix)) return '';
  return normalizeText(path.slice(prefix.length));
}

export function resolveCurrentLessonIndex({
  courseId,
  lessons,
  lastPath,
  lastLabel,
}: ResolveCourseProgressInput): number {
  if (!lessons.length) return -1;

  const normalizedLabel = normalizeText(lastLabel);
  if (normalizedLabel) {
    const byLabel = lessons.findIndex((lesson) => {
      const lessonLabel = normalizeText(lesson.label || lesson.title || lesson.period);
      return lessonLabel === normalizedLabel;
    });
    if (byLabel >= 0) return byLabel;
  }

  const lessonIdFromPath = resolveLessonIdFromPath(courseId, lastPath);
  if (lessonIdFromPath) {
    const byPeriod = lessons.findIndex((lesson) => normalizeText(lesson.period) === lessonIdFromPath);
    if (byPeriod >= 0) return byPeriod;
  }

  return -1;
}

export function calculateCourseProgress({
  courseId,
  lessons,
  lastPath,
  lastLabel,
}: ResolveCourseProgressInput): CourseProgressStats {
  const total = lessons.length;
  if (!total) {
    return { percent: 0, completed: 0, total: 0 };
  }

  const currentIndex = resolveCurrentLessonIndex({ courseId, lessons, lastPath, lastLabel });
  const completed = currentIndex >= 0 ? currentIndex + 1 : 0;
  const percent = Math.round((completed / total) * 100);

  return {
    percent: Math.min(Math.max(percent, 0), 100),
    completed,
    total,
  };
}
