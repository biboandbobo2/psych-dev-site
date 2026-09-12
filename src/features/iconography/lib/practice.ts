import type { Difficulty, IconRecord, IconSummary, Question, Topic } from '../types';
import { loadIcon } from './catalog';
import { teachingQuestions } from './learning';
import { readProgress } from './progress';
import { createRng, shuffle } from './quiz';
import { allRecordQuestions } from './recognition';

export interface PracticeSession { iconId: string; topic: Topic; difficulty: Difficulty; repeat: boolean; seed: number }
export interface PracticeLesson { questions: Question[]; records: IconRecord[] }

export const MAX_QUESTIONS = 12;
/** Паспортов на занятие: вопросов темы в одном паспорте бывает всего один, поэтому берём с запасом. */
const MAX_RECORDS = 12;
/** Иконостас разбирается по общей схеме: паспорта для него не нужны. */
const TEXT_ONLY: Topic[] = ['iconostasis'];
/** Карточки без репродукции уместны только там, где занятие не обещает разбор изображения. */
const TEXT_TOPICS: Topic[] = ['iconostasis', 'feast'];
/** Праздничные сюжеты ищем по группе узнавания, чтобы не читать все паспорта ради отбора. */
const FEAST_GROUPS = new Set(['annunciation', 'nativity', 'presentation', 'baptism', 'transfiguration', 'lazarus',
  'entry', 'crucifixion', 'resurrection', 'ascension', 'pentecost', 'dormition', 'mary-entry', 'noli']);

/** Какие темы вопросов паспорта идут в занятие по выбранной теме. */
function questionTopics(topic: Topic): Topic[] {
  if (topic === 'feast') return ['feast', 'subject'];
  return [topic];
}

/** Индекс несёт темы вопросов паспорта; у старого индекса поля нет — тогда икона подходит любой теме. */
const hasTopic = (icon: IconSummary, topic: Topic) => icon.topics?.includes(topic) ?? true;

/** Иконы, из которых вообще может выйти вопрос выбранной темы. */
export function iconPool(topic: Topic, icons: IconSummary[]): IconSummary[] {
  if (topic === 'mary') return icons.filter((icon) => icon.recognitionGroup === 'mary' && hasTopic(icon, 'mary'));
  if (topic === 'feast') {
    return icons.filter((icon) => icon.recognitionGroup && FEAST_GROUPS.has(icon.recognitionGroup)
      && questionTopics('feast').some((wanted) => hasTopic(icon, wanted)));
  }
  return icons.filter((icon) => hasTopic(icon, topic));
}

/** Что известно о теме до загрузки паспортов: размер пула и есть ли занятие вообще без изображений. */
export function topicSummary(topic: Topic, icons: IconSummary[]): { size: number; textOnly: boolean } {
  const textOnly = TEXT_ONLY.includes(topic);
  return { size: textOnly ? 0 : iconPool(topic, icons).length, textOnly };
}

/** В итог занятия идут только произведения, из которых действительно прозвучал вопрос. */
const askedRecords = (questions: Question[], records: IconRecord[]) => {
  const asked = new Set(questions.map((question) => question.iconId));
  return records.filter((record) => asked.has(record.id));
};

const normalize = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Один и тот же вопрос не должен прозвучать дважды в разных формулировках одного занятия. */
export function dedupeByPrompt(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const ids = new Set<string>();
  return questions.filter((question) => {
    const key = normalize(question.prompt);
    if (seen.has(key) || ids.has(question.id)) return false;
    seen.add(key);
    ids.add(question.id);
    return true;
  });
}

export async function prepareLesson(session: PracticeSession, icons: IconSummary[]): Promise<PracticeLesson> {
  const rng = createRng(session.seed);

  // Одна икона — всё о ней: визуальные вопросы паспорта плюс углублённый вопрос викторины.
  if (session.iconId) {
    const record = await loadIcon(session.iconId);
    const expert = record.recognition?.expert;
    const questions = dedupeByPrompt([...record.questions, ...(expert ? [expert] : [])]);
    return { questions: shuffle(questions, rng), records: [record] };
  }

  if (session.repeat) {
    const difficult = readProgress().difficult;
    const selected = icons.filter((icon) => difficult.some((id) => id.startsWith(`${icon.id}-`))).slice(0, MAX_QUESTIONS);
    const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
    const questions = [
      ...teachingQuestions.filter((question) => difficult.includes(question.id)),
      ...records.flatMap(allRecordQuestions).filter((question) => difficult.includes(question.id)),
    ];
    const asked = shuffle(questions, rng).slice(0, MAX_QUESTIONS);
    return { questions: asked, records: askedRecords(asked, records) };
  }

  const theory = TEXT_TOPICS.includes(session.topic)
    ? teachingQuestions.filter((question) => question.topic === session.topic)
    : [];
  if (TEXT_ONLY.includes(session.topic)) return { questions: theory.slice(0, MAX_QUESTIONS), records: [] };

  const selected = shuffle(iconPool(session.topic, icons), rng).slice(0, MAX_RECORDS);
  const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
  const wanted = questionTopics(session.topic);
  // Вопросы темы живут и в паспорте, и в трёх вопросах викторины: «какой сюжет» и «какой тип» — именно там.
  const questions = records.flatMap(allRecordQuestions).filter((question) => wanted.includes(question.topic));
  const asked = shuffle([...theory, ...dedupeByPrompt(questions)], rng).slice(0, MAX_QUESTIONS);
  return { questions: asked, records: askedRecords(asked, records) };
}
