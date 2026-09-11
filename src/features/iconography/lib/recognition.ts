import type { Difficulty, IconRecord, IconSummary, Question } from '../types';
import { loadIcon } from './catalog';
import { readProgress } from './progress';

export type Collection = 'russian' | 'georgian' | 'byzantine' | 'greek' | 'all';
export const recognitionLevels: { id: Difficulty; label: string; note: string }[] = [
  { id: 'beginner', label: 'Начальный', note: 'Узнать персонажа или событие' },
  { id: 'explorer', label: 'Средний', note: 'Назвать святого или сюжет точнее' },
  { id: 'expert', label: 'Углублённый', note: 'Различить типы и визуальные признаки' },
];
export const recognitionCollections: { id: Collection; label: string }[] = [
  { id: 'russian', label: 'Русская традиция' }, { id: 'georgian', label: 'Грузинская традиция' }, { id: 'byzantine', label: 'Византийская традиция' }, { id: 'greek', label: 'Греческая и критская' }, { id: 'all', label: 'Все традиции' },
];
export interface RecognitionSession { level: Difficulty; collection: Collection; round: number; repeat: boolean }
export interface RecognitionItem { icon: IconRecord; question: Question }
const groupOrder = ['christ', 'mary', 'nicholas', 'george', 'apostle', 'annunciation', 'nativity', 'baptism', 'transfiguration', 'entry', 'resurrection', 'dormition', 'ascension', 'baptist', 'elijah', 'archangel'];
export function selectRecognitionIcons(icons: IconSummary[], collection: Collection, round: number): IconSummary[] {
  const matches = (x: IconSummary) => collection === 'all' || (collection === 'russian' ? x.tradition === 'Русская' : collection === 'georgian' ? x.tradition === 'Грузинская' : collection === 'greek' ? x.tradition === 'Греческая' || x.tradition.includes('критская') : x.tradition.startsWith('Византийская') && !x.tradition.includes('критская'));
  const pool = icons.filter((x) => x.recognitionGroup && matches(x));
  const groups = [...new Set([...groupOrder, ...pool.map((x) => x.recognitionGroup!)])].filter((group) => pool.some((x) => x.recognitionGroup === group));
  const start = (round * 7) % Math.max(groups.length, 1);
  const ordered = [...groups.slice(start), ...groups.slice(0, start)];
  const selected = ordered.map((group) => { const variants = pool.filter((x) => x.recognitionGroup === group); return variants[round % variants.length]; }).slice(0, 7);
  // Small regional collections remain honest: no repeats to manufacture a seven-icon lesson.
  return selected;
}
export function allRecordQuestions(record: IconRecord): Question[] {
  return [...record.questions, ...(record.recognition ? recognitionLevels.map((x) => record.recognition![x.id]) : [])];
}
export async function loadRecognitionLesson(icons: IconSummary[], session: RecognitionSession): Promise<RecognitionItem[]> {
  if (session.repeat) {
    const ids = readProgress().difficult.filter((id) => id.includes('-recognition-'));
    const selected = icons.filter((icon) => ids.some((id) => id.startsWith(`${icon.id}-recognition-`))).slice(0, 7);
    const records = await Promise.all(selected.map((x) => loadIcon(x.id)));
    return records.flatMap((icon) => allRecordQuestions(icon).filter((q) => ids.includes(q.id)).map((question) => ({ icon, question }))).slice(0, 7);
  }
  const records = await Promise.all(selectRecognitionIcons(icons, session.collection, session.round).map((x) => loadIcon(x.id)));
  return records.filter((icon) => icon.recognition).map((icon) => ({ icon, question: icon.recognition![session.level] }));
}
