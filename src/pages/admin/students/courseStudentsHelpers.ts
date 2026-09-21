import { courseStudentLabel, type CourseStudent } from '../../../types/courseStudents';

/** Порядок строк в таблице; значения совпадают с value в селекте сортировки. */
export type StudentSort = 'progress' | 'name' | 'lastLogin';

export interface StudentRow {
  student: CourseStudent;
  /** Сколько опубликованных занятий курса студент отметил просмотренными. */
  watched: number;
}

/** Русские склонения по числу: [1, 2–4, 5+]. */
export function plural(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail === 1) return forms[0];
  if (tail > 1 && tail < 5) return forms[1];
  return forms[2];
}

/** Поиск по имени и почте, регистронезависимый. Пустой запрос пропускает всех. */
export function matchesQuery(student: CourseStudent, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [student.displayName, student.email].some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(needle)
  );
}

function loginMs(student: CourseStudent): number {
  if (!student.lastLoginAt) return 0;
  const ms = Date.parse(student.lastLoginAt);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Сортировка без мутации входа; имя — тай-брейк во всех режимах. */
export function sortRows(rows: StudentRow[], sort: StudentSort): StudentRow[] {
  const byName = (a: StudentRow, b: StudentRow) =>
    courseStudentLabel(a.student).localeCompare(courseStudentLabel(b.student), 'ru');

  return [...rows].sort((a, b) => {
    if (sort === 'name') return byName(a, b);
    const diff =
      sort === 'lastLogin' ? loginMs(b.student) - loginMs(a.student) : b.watched - a.watched;
    return diff !== 0 ? diff : byName(a, b);
  });
}

/** Подпись секции потока: «N студентов · в среднем k из Z занятий». */
export function groupSubtitle(count: number, average: number, lessonsTotal: number): string {
  const students = `${count} ${plural(count, ['студент', 'студента', 'студентов'])}`;
  if (lessonsTotal === 0) return students;
  // «X из N занятий» — партитивный родительный, форма одна при любом N.
  return `${students} · в среднем ${average} из ${lessonsTotal} занятий`;
}

/** Среднее число просмотренных занятий по секции, округлённое до целого. */
export function averageWatched(rows: StudentRow[]): number {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.watched, 0) / rows.length);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(date: Date, now: Date): number {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((to - from) / DAY_MS);
}

/**
 * Последний вход человеческим языком: свежие даты читаются относительно,
 * старше месяца — без точной даты (она там уже не помогает), `null` — «никогда».
 */
export function formatLastLogin(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'никогда';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 'никогда';

  const days = daysBetween(new Date(ms), now);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days > 31) return 'больше месяца назад';
  return new Date(ms).toLocaleDateString('ru-RU');
}

/** Инициалы для аватара-заглушки: из имени, иначе из почты, иначе из uid. */
export function studentInitials(student: CourseStudent): string {
  const source = student.displayName?.trim() || student.email || student.uid;
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return (letters.join('') || source.slice(0, 1)).toUpperCase();
}

/** Пастельные подложки аватара (токены theme.css) — чтобы строки различались. */
const AVATAR_TONES = [
  'bg-pastel-blue text-pastel-blue-deep',
  'bg-pastel-cream text-accent-deep',
  'bg-pastel-sage text-accent-deep',
  'bg-pastel-lilac text-ink',
  'bg-pastel-terracotta text-ink',
];

export function avatarTone(uid: string): string {
  let hash = 0;
  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
