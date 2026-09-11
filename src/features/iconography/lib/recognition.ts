import type { Difficulty, IconRecord, IconSummary, Question } from '../types';
import { loadIcon, traditionGroup } from './catalog';
import { readProgress } from './progress';
import { createRng, shuffle } from './quiz';

export type Collection = 'russian' | 'georgian' | 'byzantine' | 'greek' | 'all';

export const recognitionLevels: { id: Difficulty; label: string; note: string }[] = [
  { id: 'beginner', label: 'Начальный', note: 'Узнать персонажа или событие' },
  { id: 'explorer', label: 'Средний', note: 'Назвать святого или сюжет точнее' },
  { id: 'expert', label: 'Углублённый', note: 'Различить типы и визуальные признаки' },
];

export const recognitionCollections: { id: Collection; label: string }[] = [
  { id: 'russian', label: 'Русская традиция' },
  { id: 'georgian', label: 'Грузинская традиция' },
  { id: 'byzantine', label: 'Византийская традиция' },
  { id: 'greek', label: 'Греческая и критская' },
  { id: 'all', label: 'Все традиции' },
];

/** Один вопрос повторного занятия: икона плюс конкретный вопрос её паспорта. */
export interface RetryTarget { iconId: string; questionId: string }

export interface RecognitionSession {
  level: Difficulty;
  collection: Collection;
  /** Сид занятия: подборка, порядок икон и порядок вариантов. */
  seed: number;
  /** Повтор накопленных сложных вопросов викторины. */
  repeat: boolean;
  /** Повтор ошибок только что законченного занятия. Важнее, чем repeat. */
  retry?: RetryTarget[];
}

export interface RecognitionItem { icon: IconRecord; question: Question }

/** Ответ на один вопрос занятия: нужен итогу и повтору ошибок именно этой сессии. */
export interface RecognitionResult { item: RecognitionItem; chosen: string; correct: boolean }

const LESSON_SIZE = 7;
/** Иконы последних занятий: столько занятий подряд стараемся не повторять ни одной работы. */
const LESSON_MEMORY = 3;
const LAST_LESSONS_KEY = 'academy.iconography.lastLessons.v2';
/** Сколько раз икона уже встречалась: при наборе предпочитаем реже виденные. */
const SEEN_KEY = 'academy.iconography.seen.v1';
/** Ключ первой версии хранил одно занятие плоским списком; чистим его вместе с новыми. */
const LEGACY_LAST_LESSON_KEY = 'academy.iconography.lastLesson.v1';

export type SeenCounts = Readonly<Record<string, number>>;

function readLastLessons(): string[][] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LAST_LESSONS_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter((lesson): lesson is unknown[] => Array.isArray(lesson))
      .slice(-LESSON_MEMORY)
      .map((lesson) => lesson.filter((id): id is string => typeof id === 'string' && id.length < 80).slice(0, 20));
  } catch {
    return [];
  }
}

/** Иконы трёх последних занятий одним списком. */
export function recentIconIds(): string[] {
  return [...new Set(readLastLessons().flat())];
}

export function readSeenCounts(): Record<string, number> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const counts: Record<string, number> = {};
    for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
      if (id.length < 80 && typeof value === 'number' && Number.isSafeInteger(value) && value > 0) counts[id] = value;
    }
    return counts;
  } catch {
    return {};
  }
}

function rememberLesson(ids: readonly string[]): void {
  try {
    const lessons = [...readLastLessons(), [...ids].slice(0, 20)].slice(-LESSON_MEMORY);
    localStorage.setItem(LAST_LESSONS_KEY, JSON.stringify(lessons));
    const counts = readSeenCounts();
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    localStorage.setItem(SEEN_KEY, JSON.stringify(counts));
  } catch {
    // Приватный режим или переполненное хранилище: занятие всё равно идёт.
  }
}

/** Сброс истории занятий: вызывается вместе со сбросом общего прогресса. */
export function clearLessonHistory(): void {
  try {
    for (const key of [LAST_LESSONS_KEY, SEEN_KEY, LEGACY_LAST_LESSON_KEY]) localStorage.removeItem(key);
  } catch {
    // Нечего чистить: хранилище недоступно.
  }
}

function matchesCollection(icon: IconSummary, collection: Collection): boolean {
  switch (collection) {
    case 'all': return true;
    case 'russian': return icon.tradition === 'Русская';
    case 'georgian': return icon.tradition === 'Грузинская';
    case 'greek': return icon.tradition === 'Греческая' || icon.tradition.includes('критская');
    case 'byzantine': return icon.tradition.startsWith('Византийская') && !icon.tradition.includes('критская');
  }
}

/** Сколько работ викторины в подборке: при семи и меньше повторы между занятиями неизбежны. */
export function collectionSize(icons: IconSummary[], collection: Collection): number {
  return icons.filter((icon) => icon.recognitionGroup && matchesCollection(icon, collection)).length;
}

const groupsOf = (icons: IconSummary[]) => [...new Set(icons.map((icon) => icon.recognitionGroup!))];

/**
 * Слоты занятия: до семи сюжетных групп, каждая — список работ, из которых берём одну.
 * Для «всех традиций» группы набираются по кругу, иначе 46 русских записей вытесняют остальные.
 */
function lessonSlots(pool: IconSummary[], collection: Collection, rng: () => number): IconSummary[][] {
  if (collection !== 'all') {
    return shuffle(groupsOf(pool), rng)
      .slice(0, LESSON_SIZE)
      .map((group) => pool.filter((icon) => icon.recognitionGroup === group));
  }

  const byTradition = new Map<string, IconSummary[]>();
  for (const icon of pool) {
    const key = traditionGroup(icon.tradition);
    byTradition.set(key, [...(byTradition.get(key) ?? []), icon]);
  }
  const queues = shuffle([...byTradition.keys()], rng)
    .map((tradition) => ({ icons: byTradition.get(tradition)!, groups: shuffle(groupsOf(byTradition.get(tradition)!), rng) }));

  const slots: IconSummary[][] = [];
  const used = new Set<string>();
  let served = true;
  while (slots.length < LESSON_SIZE && served) {
    served = false;
    for (const queue of queues) {
      if (slots.length >= LESSON_SIZE) break;
      let group = queue.groups.shift();
      while (group && used.has(group)) group = queue.groups.shift();
      if (!group) continue;
      used.add(group);
      served = true;
      slots.push(queue.icons.filter((icon) => icon.recognitionGroup === group));
    }
  }
  return slots;
}

/**
 * Подборка занятия: до семи разных сюжетных групп, по одной случайной работе из группы.
 * Порядок групп и выбор работы зависят от сида, поэтому два посетителя начинают с разных икон.
 * `exclude` — иконы последних занятий; `seen` — счётчик показов: при равных условиях
 * берём ту работу, которую посетитель видел реже.
 */
export function selectRecognitionIcons(
  icons: IconSummary[],
  collection: Collection,
  seed: number,
  exclude: readonly string[] = [],
  seen: SeenCounts = {},
): IconSummary[] {
  const pool = icons.filter((icon) => icon.recognitionGroup && matchesCollection(icon, collection));
  const rng = createRng(seed);
  const skip = new Set(exclude);
  const times = (icon: IconSummary) => seen[icon.id] ?? 0;

  return lessonSlots(pool, collection, rng).map((variants) => {
    const fresh = variants.filter((icon) => !skip.has(icon.id));
    const choices = fresh.length ? fresh : variants;
    const least = Math.min(...choices.map(times));
    const rare = choices.filter((icon) => times(icon) === least);
    return rare[Math.floor(rng() * rare.length)];
  });
}

export function allRecordQuestions(record: IconRecord): Question[] {
  const recognition = record.recognition;
  return [...record.questions, ...(recognition ? recognitionLevels.map((level) => recognition[level.id]) : [])];
}

async function loadRetryItems(targets: readonly RetryTarget[], seed: number): Promise<RecognitionItem[]> {
  const records = await Promise.all([...new Set(targets.map((x) => x.iconId))].map((id) => loadIcon(id)));
  const byId = new Map(records.map((record) => [record.id, record]));
  const items = targets.flatMap(({ iconId, questionId }) => {
    const icon = byId.get(iconId);
    const question = icon && allRecordQuestions(icon).find((x) => x.id === questionId);
    return icon && question ? [{ icon, question }] : [];
  });
  return shuffle(items, createRng(seed));
}

async function loadDifficultItems(icons: IconSummary[], seed: number): Promise<RecognitionItem[]> {
  const ids = readProgress().difficult.filter((id) => id.includes('-recognition-'));
  const matched = icons.filter((icon) => ids.some((id) => id.startsWith(`${icon.id}-recognition-`)));
  const selected = shuffle(matched, createRng(seed)).slice(0, LESSON_SIZE);
  const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
  const items = records.flatMap((icon) =>
    allRecordQuestions(icon).filter((question) => ids.includes(question.id)).map((question) => ({ icon, question })));
  return shuffle(items, createRng(seed + 1)).slice(0, LESSON_SIZE);
}

export async function loadRecognitionLesson(icons: IconSummary[], session: RecognitionSession): Promise<RecognitionItem[]> {
  if (session.retry?.length) return loadRetryItems(session.retry, session.seed);
  if (session.repeat) return loadDifficultItems(icons, session.seed);

  const selected = selectRecognitionIcons(icons, session.collection, session.seed, recentIconIds(), readSeenCounts());
  const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
  const items = records
    .filter((icon) => icon.recognition)
    .map((icon) => ({ icon, question: icon.recognition![session.level] }));
  rememberLesson(items.map((item) => item.icon.id));
  return items;
}
