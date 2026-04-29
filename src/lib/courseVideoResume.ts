import { readCloudProgress, scheduleVideoResumeUpload } from './courseProgress/cloudSync';

const STORAGE_KEY = 'course-video-resume-v1';

export interface CourseVideoResumePoint {
  path: string;
  videoId: string;
  timeSec: number;
  lessonLabel?: string;
  videoTitle?: string;
  updatedAt: string;
}

interface SaveCourseVideoResumePointInput {
  courseId: string;
  path: string;
  videoId: string;
  timeMs: number;
  lessonLabel?: string;
  videoTitle?: string;
}

type CourseVideoResumeMap = Record<string, CourseVideoResumePoint>;

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.endsWith('/') && withSlash.length > 1 ? withSlash.slice(0, -1) : withSlash;
}

function readStorage(): CourseVideoResumeMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as CourseVideoResumeMap;
  } catch {
    return {};
  }
}

function writeStorage(data: CourseVideoResumeMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write failures
  }
}

export function saveCourseVideoResumePoint({
  courseId,
  path,
  videoId,
  timeMs,
  lessonLabel,
  videoTitle,
}: SaveCourseVideoResumePointInput): void {
  if (!courseId || !path || !videoId || !Number.isFinite(timeMs)) return;

  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return;

  const normalizedTimeSec = Math.max(0, Math.floor(timeMs / 1000));
  const current = readStorage();
  const previous = current[courseId];

  // Avoid frequent writes for insignificant drift.
  if (
    previous &&
    previous.path === normalizedPath &&
    previous.videoId === videoId &&
    Math.abs(previous.timeSec - normalizedTimeSec) < 3
  ) {
    return;
  }

  const entry: CourseVideoResumePoint = {
    path: normalizedPath,
    videoId,
    timeSec: normalizedTimeSec,
    lessonLabel: lessonLabel?.trim() || undefined,
    videoTitle: videoTitle?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  current[courseId] = entry;

  writeStorage(current);
  scheduleVideoResumeUpload(courseId, entry);
}

export function getCourseVideoResumePoint(courseId: string): CourseVideoResumePoint | null {
  if (!courseId) return null;
  const cloud = readCloudProgress(courseId)?.videoResume;
  if (
    cloud &&
    cloud.path &&
    cloud.videoId &&
    Number.isFinite(cloud.timeSec)
  ) {
    return {
      path: cloud.path,
      videoId: cloud.videoId,
      timeSec: cloud.timeSec,
      lessonLabel: cloud.lessonLabel,
      videoTitle: cloud.videoTitle,
      updatedAt: cloud.updatedAt,
    };
  }
  const current = readStorage();
  const item = current[courseId];

  if (!item || !item.path || !item.videoId || !Number.isFinite(item.timeSec)) {
    return null;
  }

  return item;
}

export function buildCourseContinuePath(courseId: string, fallbackPath: string): string {
  const normalizedFallbackPath = normalizePath(fallbackPath);
  if (!courseId || !normalizedFallbackPath) {
    return normalizedFallbackPath || '/profile';
  }

  const resume = getCourseVideoResumePoint(courseId);
  if (!resume) {
    return normalizedFallbackPath;
  }

  const params = new URLSearchParams();
  params.set('study', '1');
  params.set('panel', 'notes');
  params.set('video', resume.videoId);
  params.set('t', String(Math.max(0, resume.timeSec)));

  const separator = resume.path.includes('?') ? '&' : '?';
  return `${resume.path}${separator}${params.toString()}`;
}
