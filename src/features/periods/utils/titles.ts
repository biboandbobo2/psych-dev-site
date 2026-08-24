/**
 * Подзаголовок модалок «Вопрос лектору» / «Поделиться конспектом».
 * Название занятия и лекции часто совпадают с точностью до финальной точки —
 * сравниваем нормализованно, чтобы не показывать «…сферы — …сферы.».
 */
export function formatLessonLectureTitle(
  periodTitle: string,
  lectureTitle?: string | null
): string {
  const normalize = (value: string) => value.trim().replace(/\.+$/, '');
  if (!lectureTitle || normalize(lectureTitle) === normalize(periodTitle)) {
    return normalize(periodTitle);
  }
  return `${normalize(periodTitle)} — ${normalize(lectureTitle)}`;
}
