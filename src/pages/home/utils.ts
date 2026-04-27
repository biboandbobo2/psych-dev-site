/** Возвращает путь страницы «О курсе» для core- и dynamic-курсов. */
export function getCourseIntroPath(courseId: string): string {
  if (courseId === 'development') return '/development/intro';
  if (courseId === 'clinical') return '/clinical/intro';
  if (courseId === 'general') return '/general/intro';
  return `/course/${encodeURIComponent(courseId)}/intro`;
}

/** Форматирует ISO-дату 'YYYY-MM-DD' в 'DD.MM'; некорректный формат — возвращается как есть. */
export function formatDueDateRu(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}`;
}
