import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconSummary, Topic } from '../types';
import { prepareLesson } from './practice';
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
});
