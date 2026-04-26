/**
 * Pure-helpers для построения календарной сетки.
 * Не зависят от React/Firebase — легко тестируются и переиспользуются.
 */

export interface CalendarMonthDay {
  /** ISO YYYY-MM-DD в локальной таймзоне (Asia/Tbilisi на проде, локальная в dev). */
  isoDate: string;
  /** Объект Date в полночь локальной таймзоны для сортировки/сравнения. */
  date: Date;
  dayOfMonth: number;
  monthOfYear: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  /** 0 = воскресенье, 1 = понедельник, …, 6 = суббота. */
  dayOfWeek: number;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Возвращает 6×7 = 42 дня для месяца, в котором лежит date,
 * с заполнением недели до понедельника в начале и до воскресенья в конце.
 * Считаем неделю с понедельника.
 */
export function buildMonthGrid(date: Date, today: Date = new Date()): CalendarMonthDay[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);

  // Сдвиг до понедельника: getDay() даёт 0 (вс) … 6 (сб).
  const firstWeekday = firstOfMonth.getDay();
  const daysFromMonday = (firstWeekday + 6) % 7; // вс→6, пн→0, вт→1, …
  const gridStart = new Date(year, month, 1 - daysFromMonday);

  const todayIso = toIsoDate(startOfDay(today));
  const days: CalendarMonthDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    days.push({
      isoDate: toIsoDate(d),
      date: d,
      dayOfMonth: d.getDate(),
      monthOfYear: d.getMonth(),
      isCurrentMonth: d.getMonth() === month,
      isToday: toIsoDate(d) === todayIso,
      dayOfWeek: d.getDay(),
    });
  }
  return days;
}

/**
 * Группирует элементы по локальной ISO-дате, извлекаемой из заданного поля.
 * Если поле возвращает null/undefined — элемент пропускается.
 */
export function groupItemsByDate<T>(
  items: readonly T[],
  getDate: (item: T) => Date | null | undefined
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const d = getDate(item);
    if (!d) continue;
    const iso = toIsoDate(startOfDay(d));
    const arr = out.get(iso);
    if (arr) arr.push(item);
    else out.set(iso, [item]);
  }
  return out;
}

/**
 * Сдвигает дату на N месяцев. Используется для навигации ← →.
 * Возвращает первое число целевого месяца.
 */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Сдвигает дату на N дней. Возвращает полночь нового дня.
 */
export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

/**
 * Возвращает понедельник недели, в которой лежит date (полночь).
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay(); // 0 = вс
  const daysFromMonday = (dayOfWeek + 6) % 7;
  return addDays(d, -daysFromMonday);
}

/**
 * Возвращает 7 дней недели, начиная с понедельника той недели, в которой лежит date.
 */
export function buildWeekGrid(date: Date, today: Date = new Date()): CalendarMonthDay[] {
  const start = startOfWeek(date);
  const todayIso = toIsoDate(startOfDay(today));
  const days: CalendarMonthDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    days.push({
      isoDate: toIsoDate(d),
      date: d,
      dayOfMonth: d.getDate(),
      monthOfYear: d.getMonth(),
      isCurrentMonth: true, // в week-grid все дни считаются «текущими»
      isToday: toIsoDate(d) === todayIso,
      dayOfWeek: d.getDay(),
    });
  }
  return days;
}

/**
 * Метка диапазона недели для toolbar-а: «4–10 мая 2026».
 */
export function formatWeekRangeRu(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString('ru-RU', {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'short' }),
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endStr = end.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

/**
 * Длительность события в днях (round-up). 1 для one-day, 5 для 22.07–26.07.
 */
export function eventDurationDays(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 1;
  return Math.max(1, Math.ceil((endMs - startMs) / MS_IN_DAY));
}

/**
 * Месяц-год для отображения в toolbar (например, «апрель 2026»).
 * Использует ru-RU локаль.
 */
export function formatMonthYearRu(date: Date): string {
  const formatted = date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  // Заменим первую букву на заглавную для красоты.
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
