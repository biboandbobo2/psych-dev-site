/**
 * Путь к intro-странице курса. Для core-курсов (development, clinical, general)
 * маршрут живёт на верхнем уровне (/development/intro и т.п.), для динамических
 * курсов — под /course/:courseId/intro.
 */
export function getCourseIntroPath(courseId: string): string {
  if (courseId === 'development' || courseId === 'clinical' || courseId === 'general') {
    return `/${courseId}/intro`;
  }
  return `/course/${encodeURIComponent(courseId)}/intro`;
}
