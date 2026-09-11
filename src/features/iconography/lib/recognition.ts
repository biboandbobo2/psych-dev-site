import type { Difficulty, IconRecord, IconSummary, Question } from '../types';
import { loadIcon } from './catalog';
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
const LAST_LESSON_KEY = 'academy.iconography.lastLesson.v1';

/** ID икон предыдущего занятия: их стараемся не показывать снова подряд. */
function readLastLessonIds(): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LAST_LESSON_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((id): id is string => typeof id === 'string' && id.length < 80).slice(0, 20);
  } catch {
    return [];
  }
}

function writeLastLessonIds(ids: string[]): void {
  try {
    localStorage.setItem(LAST_LESSON_KEY, JSON.stringify(ids.slice(0, 20)));
  } catch {
    // Приватный режим или переполненное хранилище: занятие всё равно идёт.
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

/**
 * Подборка занятия: до семи разных сюжетных групп, по одной случайной работе из группы.
 * Порядок групп и выбор работы зависят от сида, поэтому два посетителя начинают с разных икон.
 * `exclude` — иконы предыдущего занятия; повторяем их только если других в группе нет.
 */
export function selectRecognitionIcons(
  icons: IconSummary[],
  collection: Collection,
  seed: number,
  exclude: readonly string[] = [],
): IconSummary[] {
  const pool = icons.filter((icon) => icon.recognitionGroup && matchesCollection(icon, collection));
  const groups = [...new Set(pool.map((icon) => icon.recognitionGroup!))];
  const rng = createRng(seed);
  const skip = new Set(exclude);
  return shuffle(groups, rng)
    .slice(0, LESSON_SIZE)
    .map((group) => {
      const variants = pool.filter((icon) => icon.recognitionGroup === group);
      const fresh = variants.filter((icon) => !skip.has(icon.id));
      const choices = fresh.length ? fresh : variants;
      return choices[Math.floor(rng() * choices.length)];
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

  const selected = selectRecognitionIcons(icons, session.collection, session.seed, readLastLessonIds());
  const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
  const items = records
    .filter((icon) => icon.recognition)
    .map((icon) => ({ icon, question: icon.recognition![session.level] }));
  writeLastLessonIds(items.map((item) => item.icon.id));
  return items;
}
