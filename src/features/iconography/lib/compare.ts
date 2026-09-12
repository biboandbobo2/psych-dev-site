import type { IconRecord, IconSummary } from '../types';
import { displayPeriod, traditionGroup } from './catalog';

/** Нормализация как в валидаторе паспортов: ё→е, регистр, только буквы и цифры. */
const normalize = (text: string) => (text || '').toLocaleLowerCase('ru').replaceAll('ё', 'е')
  .replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Грубое отсечение окончания: «композиция» и «композиции» должны совпасть. */
const stem = (word: string) => (word.length > 5 ? word.slice(0, -2) : word);

/** Значимые слова: короткие предлоги и служебные слова темы не задают. */
const keywords = (text: string) =>
  new Set(normalize(text).split(' ').filter((word) => word.length >= 5).map(stem));

const shared = (a: Set<string>, b: Set<string>) => [...a].filter((word) => b.has(word)).length;

/**
 * Правая икона по умолчанию: «один сюжет, две традиции» учит больше, чем случайная пара.
 * Сначала та же группа узнавания (другая традиция предпочтительнее), затем та же традиция
 * с тем же сюжетом, затем первая отличная запись.
 */
export function defaultRight(icons: IconSummary[], leftId: string) {
  const rest = icons.filter((icon) => icon.id !== leftId);
  const left = icons.find((icon) => icon.id === leftId);
  if (!left) return rest[0]?.id;
  const group = left.recognitionGroup
    ? rest.filter((icon) => icon.recognitionGroup === left.recognitionGroup)
    : [];
  const otherTradition = group.find((icon) => traditionGroup(icon.tradition) !== traditionGroup(left.tradition));
  const sameSubject = rest.find((icon) => icon.subject && icon.subject === left.subject
    && traditionGroup(icon.tradition) === traditionGroup(left.tradition));
  return (otherTradition ?? group[0] ?? sameSubject ?? rest[0])?.id;
}

export interface CompareRow { label: string; left: string; right: string; same: boolean }

/** Редакторское пояснение после «;» в таблицу не идёт: в паспорте оно остаётся целиком. */
const factValue = (value: string | undefined) => (value ?? '').split(';')[0].trim() || '—';

// Век берём из centuries: «1408 год» и «Около 1497 года» несопоставимы, XV век — сопоставим.
const traditionValue = (icon: IconRecord) =>
  `${icon.tradition} · ${displayPeriod({ period: '', centuries: icon.centuries })}`;

export function compareRows(left: IconRecord, right: IconRecord): CompareRow[] {
  const fields: [string, string, string][] = [
    ['Сюжет', left.subject, right.subject],
    ['Тип', left.type, right.type],
    ['Персонажи', left.people, right.people],
    ['Традиция и век', traditionValue(left), traditionValue(right)],
    ['Материал', left.material, right.material],
  ];
  return fields.map(([label, a, b]) => {
    const first = factValue(a);
    const second = factValue(b);
    return { label, left: first, right: second, same: first !== '—' && normalize(first) === normalize(second) };
  });
}

type Clue = IconRecord['clues'][number];

const clueWords = (clue: Clue) => keywords(`${clue.title} ${clue.text}`);

/** Наблюдение про главное в этой иконе, а не первое попавшееся (например, про оклад). */
function themedClue(icon: IconRecord) {
  const topic = keywords(`${icon.type} ${icon.subject}`);
  return icon.clues.find((clue) => shared(clueWords(clue), topic) > 0) ?? icon.clues[0];
}

/**
 * Пара наблюдений об одном и том же: сначала та, где больше общих значимых слов;
 * если общих слов нет — наблюдение про тип или сюжет своей иконы, иначе первое.
 */
export function pickClues(left: IconRecord, right: IconRecord): [Clue | undefined, Clue | undefined] {
  let best = { score: 0, left: 0, right: 0 };
  left.clues.forEach((a, i) => {
    const words = clueWords(a);
    right.clues.forEach((b, j) => {
      const score = shared(words, clueWords(b));
      if (score > best.score) best = { score, left: i, right: j };
    });
  });
  if (best.score > 0) return [left.clues[best.left], right.clues[best.right]];
  return [themedClue(left), themedClue(right)];
}

/** Задание под конкретную пару: общий сюжет и общий тип требуют разного взгляда. */
export function compareTask(left: IconRecord, right: IconRecord) {
  const same = (a: string, b: string) => Boolean(a) && normalize(a) === normalize(b);
  if (same(left.subject, right.subject)) return 'Один сюжет: найдите, чем различаются композиции и жесты.';
  if (same(left.type, right.type)) return 'Один тип: сравните, какие персонажи в него попали и как они расставлены.';
  return 'Разные образы: сравните формат, фон и жесты.';
}
