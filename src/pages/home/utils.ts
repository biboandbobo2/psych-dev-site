/** Возвращает путь страницы «О курсе» для core- и dynamic-курсов. */
export function getCourseIntroPath(courseId: string): string {
  if (courseId === 'development') return '/development/intro';
  if (courseId === 'clinical') return '/clinical/intro';
  if (courseId === 'general') return '/general/intro';
  return `/course/${encodeURIComponent(courseId)}/intro`;
}

/**
 * Актуальные задания для секции «Задания»: просроченные (dueDate < today)
 * скрываются, остальные — по возрастанию дедлайна. Лента приходит в порядке
 * createdAt, поэтому без пересортировки ближайший дедлайн вытеснялся из
 * первых карточек более свежими постами.
 * ISO-даты YYYY-MM-DD сравниваются как строки.
 */
export function selectUpcomingAssignments<T extends { kind: string; dueDate?: string | null }>(
  items: T[],
  todayKey: string,
): T[] {
  return items
    .filter((item) => item.kind === 'assignment' && !!item.dueDate && item.dueDate >= todayKey)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string));
}

/** Форматирует ISO-дату 'YYYY-MM-DD' в 'DD.MM'; некорректный формат — возвращается как есть. */
export function formatDueDateRu(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}`;
}
