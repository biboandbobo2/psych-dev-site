/** Возвращает новый Set с переключённой меткой id (immutable). */
export function toggleSet(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Разделяет ввод по запятым / пробелам / переводам строки, нормализует
 * (trim + lowercase) и оставляет только строки с символом '@'.
 */
export function parseInviteEmails(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
}

/** Переключение courseId в списке featured-курсов с сохранением порядка. */
export function toggleFeaturedCourse(prev: readonly string[], courseId: string): string[] {
  if (prev.includes(courseId)) return prev.filter((id) => id !== courseId);
  return [...prev, courseId];
}
