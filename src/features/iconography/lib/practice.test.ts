import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconSummary, Topic } from '../types';
import { iconPool, prepareLesson, topicSummary } from './practice';
import type { PracticeSession } from './practice';

const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));

const lesson = (topic: Topic, seed = 21) =>
  prepareLesson({ iconId: '', topic, difficulty: 'explorer', repeat: false, seed } as PracticeSession, icons);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    new Response(readFileSync(`${base}/records/${String(url).split('/').at(-1)}`, 'utf8'), { status: 200 }));
});
afterEach(() => vi.restoreAllMocks());

describe('набор вопросов по теме практики', () => {
  it('берёт вопросы темы и из паспорта, и из трёх вопросов викторины', async () => {
    const { questions } = await lesson('subject');
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((question) => question.topic === 'subject')).toBe(true);
    expect(questions.some((question) => question.id.includes('-recognition-'))).toBe(true);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
  });

  it('в «Типах Богородицы» показывает богородичные иконы и не подменяет тему вопросами о типе', async () => {
    const { questions, records } = await lesson('mary');
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((question) => question.topic === 'mary')).toBe(true);
    for (const record of records) expect(record.recognitionGroup).toBe('mary');
  });

  it('не подмешивает текстовые карточки в визуальные темы', async () => {
    for (const topic of ['subject', 'people', 'type', 'mary', 'attribute'] as Topic[]) {
      const { questions } = await lesson(topic);
      expect(questions.some((question) => question.id.startsWith('guide-'))).toBe(false);
    }
    const iconostasis = await lesson('iconostasis');
    expect(iconostasis.questions.every((question) => question.id.startsWith('guide-iconostasis'))).toBe(true);
    const feast = await lesson('feast');
    expect(feast.questions.some((question) => question.id.startsWith('guide-feast'))).toBe(true);
  });

  it('не ломается на теме без вопросов: список просто пуст', async () => {
    for (const topic of ['composition', 'material'] as Topic[]) {
      const { questions } = await lesson(topic);
      expect(questions.every((question) => question.topic === topic)).toBe(true);
    }
  });

  it('набирает занятие из икон, у которых тема действительно есть', async () => {
    // Раньше восемь случайных паспортов давали по теме один-два вопроса.
    for (const topic of ['subject', 'type', 'mary'] as Topic[]) {
      const { questions } = await lesson(topic);
      expect(questions.length, topic).toBeGreaterThanOrEqual(8);
    }
    // «Материал и техника» — самая узкая тема: вопросов меньше десяти во всём каталоге.
    const material = await lesson('material');
    expect(material.questions.length).toBeGreaterThanOrEqual(iconPool('material', icons).length);
  });

  it('в итог занятия отдаёт только произведения прозвучавших вопросов', async () => {
    for (const topic of ['subject', 'material', 'feast'] as Topic[]) {
      const { questions, records } = await lesson(topic);
      const asked = new Set(questions.map((question) => question.iconId));
      expect(records.map((record) => record.id).sort(), topic).toEqual([...asked].filter(Boolean).sort());
    }
  });

  it('считает размер пула темы по индексу, без загрузки паспортов', () => {
    expect(topicSummary('material', icons)).toEqual({ size: iconPool('material', icons).length, textOnly: false });
    expect(topicSummary('subject', icons).size).toBeGreaterThan(topicSummary('material', icons).size);
    expect(topicSummary('mary', icons).size).toBe(icons.filter((icon) => icon.topics?.includes('mary')
      && icon.recognitionGroup === 'mary').length);
    // Иконостас идёт по схеме: пул паспортов ему не нужен.
    expect(topicSummary('iconostasis', icons)).toEqual({ size: 0, textOnly: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});
