import { ROUTE_CONFIG } from '../routes';

const RESERVED_TOP_LEVEL_PATHS = new Set([
  '',
  'homepage',
  'features',
  'login',
  'admin',
  'superadmin',
  'profile',
  'notes',
  'timeline',
  'tests',
  'tests-lesson',
  'research',
  'migrate-topics',
  'clinical',
  'general',
  'course',
]);

const DEVELOPMENT_STATIC_PATHS = new Set(ROUTE_CONFIG.map((route) => route.path));

export function normalizeAppPath(path: string | undefined | null) {
  if (!path) {
    return '/';
  }

  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

export function getPageCourseId(path: string | undefined | null) {
  const normalizedPath = normalizeAppPath(path);

  if (DEVELOPMENT_STATIC_PATHS.has(normalizedPath)) {
    return 'development';
  }

  if (normalizedPath.startsWith('/clinical/')) {
    return 'clinical';
  }

  if (normalizedPath.startsWith('/general/')) {
    return 'general';
  }

  if (normalizedPath.startsWith('/course/')) {
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length >= 3) {
      return segments[1];
    }
    return null;
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length === 1 && !RESERVED_TOP_LEVEL_PATHS.has(segments[0])) {
    return 'development';
  }

  return null;
}

export function shouldShowStudentCourseSidebar(path: string | undefined | null) {
  const normalizedPath = normalizeAppPath(path);
  return normalizedPath === '/' || normalizedPath === '/profile' || normalizedPath === '/notes' || Boolean(getPageCourseId(normalizedPath));
}
