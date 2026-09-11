import type { Difficulty, Question, Topic } from '../types';
export const topics: { id: Topic; label: string; note: string }[] = [
  { id: 'subject', label: 'Сюжеты', note: 'Что происходит на иконе' },
  { id: 'people', label: 'Святые и персонажи', note: 'Кого мы видим' },
  { id: 'attribute', label: 'Атрибуты и жесты', note: 'Детали, которые помогают узнать образ' },
  { id: 'type', label: 'Иконографические типы', note: 'Умиление, Одигитрия, Пантократор' },
  { id: 'mary', label: 'Типы Богородицы', note: 'Умиление, Одигитрия, Знамение и другие' },
  { id: 'feast', label: 'Праздники', note: 'События церковного года' },
  { id: 'tradition', label: 'Традиции', note: 'Грузия, Русь, Византия и их связи' },
  { id: 'period', label: 'Века и периоды', note: 'Датировки без ложной точности' },
  { id: 'attribution', label: 'Авторы и мастерские', note: 'Как читать музейную атрибуцию' },
  { id: 'museum', label: 'Музеи и собрания', note: 'Где хранится произведение' },
  { id: 'iconostasis', label: 'Иконостас', note: 'Образы и их место в храме' },
];
export const difficulties: { id: Difficulty; label: string; note: string }[] = [
  { id: 'beginner', label: 'Первый взгляд', note: 'Два варианта и открытая подсказка' },
  { id: 'explorer', label: 'Исследователь', note: 'Четыре варианта, подсказка по желанию' },
  { id: 'expert', label: 'Знаток', note: 'Сначала вспомните ответ, затем откройте варианты' },
];
export function optionsFor(question: Question, difficulty: Difficulty) {
  const count = difficulty === 'beginner' ? 1 : 3;
  const options = [...new Set([question.answer, ...question.distractors])].slice(0, count + 1);
  const hash = [...question.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const offset = hash % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}
