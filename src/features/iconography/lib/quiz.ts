import type { Difficulty, Question, Topic } from '../types';

/** Темы практики. Только то, что видно на репродукции, плюс два текстовых занятия-путеводителя. */
export const topics: { id: Topic; label: string; note: string }[] = [
  { id: 'subject', label: 'Сюжеты', note: 'Что происходит на иконе' },
  { id: 'people', label: 'Святые и персонажи', note: 'Кого мы видим' },
  { id: 'attribute', label: 'Атрибуты и жесты', note: 'Детали, которые помогают узнать образ' },
  { id: 'type', label: 'Иконографические типы', note: 'Умиление, Одигитрия, Пантократор' },
  { id: 'mary', label: 'Типы Богородицы', note: 'Умиление, Одигитрия, Знамение и другие' },
  { id: 'composition', label: 'Композиция и формат', note: 'Расположение фигур, поясной или ростовой образ, фон, поля и надписи вокруг' },
  { id: 'material', label: 'Материал и техника', note: 'Из чего сделан образ: доска, резьба, шитьё, оклад, мозаика' },
  { id: 'feast', label: 'Праздники', note: 'События церковного года' },
  { id: 'iconostasis', label: 'Иконостас', note: 'Образы и их место в храме' },
];

/** Человекочитаемое название темы: ставится ярлыком над вопросом занятия. */
export const topicLabel = (topic: Topic) => topics.find((item) => item.id === topic)?.label ?? 'Вопрос занятия';

/** Уровень вопроса викторины зашит в его id; вопросы практики повторяем на среднем. */
export function repeatDifficulty(question: Question): Difficulty {
  const level = /-recognition-(beginner|explorer|expert)$/.exec(question.id)?.[1];
  return (level as Difficulty | undefined) ?? 'explorer';
}

/** Уровни названы так же, как в викторине: разница — в количестве вариантов и в помощи. */
export const difficulties: { id: Difficulty; label: string; note: string }[] = [
  { id: 'beginner', label: 'Начальный', note: 'Три варианта и открытая подсказка' },
  { id: 'explorer', label: 'Средний', note: 'Четыре варианта, подсказка по желанию' },
  { id: 'expert', label: 'Углублённый', note: 'Сначала вспомните ответ, затем откройте варианты' },
];

/**
 * Детерминированный генератор (mulberry32): одинаковый сид даёт одинаковую последовательность.
 * Нужен, чтобы порядок в пределах одного занятия не менялся при перерисовке,
 * но занятия отличались друг от друга.
 */
export function createRng(seed: number): () => number {
  let state = seed | 0 || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Перемешивание Фишера — Йетса на переданном генераторе. Исходный массив не меняется. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Стабильное число из строки: даёт вопросам разный, но воспроизводимый порядок вариантов. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

/** Сид занятия. Разный у каждого посетителя и у каждого занятия. */
export function newSessionSeed(): number {
  const buffer = new Uint32Array(1);
  const source = globalThis.crypto;
  if (source && typeof source.getRandomValues === 'function') source.getRandomValues(buffer);
  else buffer[0] = Math.floor(Math.random() * 0xffffffff);
  return buffer[0] || 1;
}

/**
 * Варианты ответа. Порядок зависит от сида занятия: при повторе того же вопроса
 * позиция правильного ответа меняется, поэтому его нельзя запомнить «по месту».
 */
export function optionsFor(question: Question, difficulty: Difficulty, seed = 0): string[] {
  // Начальный уровень выровнен с викториной: ответ и два дистрактора.
  const count = difficulty === 'beginner' ? 2 : 3;
  const options = [...new Set([question.answer, ...question.distractors])].slice(0, count + 1);
  return shuffle(options, createRng(hashSeed(question.id) ^ seed));
}
