export const MONTH_LABELS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatDisplayDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTH_LABELS[m - 1]}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Разбивает displayName ("Имя Фамилия") по последнему пробелу.
 * Если нет пробела — всё уходит в firstName, lastName пустой.
 */
export function parseDisplayName(displayName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const s = (displayName || '').trim().replace(/\s+/g, ' ');
  if (!s) return { firstName: '', lastName: '' };
  const idx = s.lastIndexOf(' ');
  if (idx < 0) return { firstName: s, lastName: '' };
  return { firstName: s.slice(0, idx), lastName: s.slice(idx + 1) };
}

/**
 * Считает displayName "полным" (есть и имя, и фамилия), если в строке
 * минимум два слова длиной ≥ 2 символа каждое.
 */
export function hasFullName(displayName: string | null | undefined): boolean {
  const { firstName, lastName } = parseDisplayName(displayName);
  return firstName.length >= 2 && lastName.length >= 2;
}
