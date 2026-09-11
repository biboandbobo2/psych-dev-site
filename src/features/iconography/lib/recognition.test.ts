import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary } from '../types';
import { optionsFor } from './quiz';
import { allRecordQuestions, loadRecognitionLesson, selectRecognitionIcons } from './recognition';

const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const readRecord = (id: string): IconRecord => JSON.parse(readFileSync(`${base}/records/${id}.json`, 'utf8'));
const quizIcons = icons.filter((icon) => icon.recognitionGroup);
const ids = (list: IconSummary[]) => list.map((icon) => icon.id);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    new Response(readFileSync(`${base}/records/${String(url).split('/').at(-1)}`, 'utf8'), { status: 200 }));
});
afterEach(() => vi.restoreAllMocks());

describe('подборка занятия', () => {
  it('даёт семь разных сюжетных групп выбранной традиции', () => {
    const lesson = selectRecognitionIcons(icons, 'russian', 4242);
    expect(lesson).toHaveLength(7);
    expect(lesson.every((icon) => icon.tradition === 'Русская')).toBe(true);
    expect(new Set(lesson.map((icon) => icon.recognitionGroup)).size).toBe(7);
    expect(new Set(ids(lesson)).size).toBe(7);
  });

  it('зависит от сида: занятия отличаются, но один сид воспроизводим', () => {
    const runs = Array.from({ length: 8 }, (_, i) => ids(selectRecognitionIcons(icons, 'russian', i + 1)));
    expect(new Set(runs.map((run) => run.join(','))).size).toBeGreaterThan(1);
    // Первая икона занятия не одна и та же для всех посетителей.
    expect(new Set(runs.map((run) => run[0])).size).toBeGreaterThan(1);
    expect(ids(selectRecognitionIcons(icons, 'russian', 3))).toEqual(runs[2]);
  });

  it('старается не повторять работы предыдущего занятия', () => {
    const previous = selectRecognitionIcons(icons, 'russian', 77);
    const next = selectRecognitionIcons(icons, 'russian', 77, ids(previous));
    expect(next.map((icon) => icon.recognitionGroup)).toEqual(previous.map((icon) => icon.recognitionGroup));
    next.forEach((icon, i) => {
      const variants = quizIcons.filter((x) => x.tradition === 'Русская' && x.recognitionGroup === icon.recognitionGroup);
      if (variants.length > 1) expect(icon.id).not.toBe(previous[i].id);
    });
  });

  it('«Все традиции» действительно смешивают традиции', () => {
    const mixed = Array.from({ length: 6 }, (_, i) => selectRecognitionIcons(icons, 'all', i + 11)).flat();
    expect(new Set(mixed.map((icon) => icon.tradition)).size).toBeGreaterThan(1);
  });

  it('держит региональные подборки отдельно', () => {
    const georgian = selectRecognitionIcons(icons, 'georgian', 9);
    expect(georgian.length).toBeGreaterThanOrEqual(5);
    expect(georgian.every((icon) => icon.tradition === 'Грузинская')).toBe(true);
    expect(new Set(georgian.map((icon) => icon.recognitionGroup)).size).toBe(georgian.length);
    for (const collection of ['byzantine', 'greek'] as const) {
      const regional = selectRecognitionIcons(icons, collection, 9);
      expect(regional.length).toBeGreaterThanOrEqual(5);
      expect(regional.every((icon) => icon.tradition !== 'Русская' && icon.tradition !== 'Грузинская')).toBe(true);
    }
  });

  it('каждая работа викторины отвечает на все три уровня', () => {
    for (const icon of quizIcons) {
      const recognition = readRecord(icon.id).recognition!;
      expect(new Set([recognition.beginner.id, recognition.explorer.id, recognition.expert.id]).size).toBe(3);
      for (const question of [recognition.beginner, recognition.explorer, recognition.expert]) {
        expect(question.distractors.length).toBeGreaterThanOrEqual(2);
        expect(question.distractors).not.toContain(question.answer);
      }
    }
  });
});

describe('варианты ответа', () => {
  it('перемешаны по сиду занятия и воспроизводимы внутри него', () => {
    const question = readRecord(quizIcons[0].id).recognition!.explorer;
    const orders = new Set(Array.from({ length: 12 }, (_, i) => optionsFor(question, 'explorer', i + 1).join('|')));
    expect(orders.size).toBeGreaterThan(1);
    for (const seed of [1, 2, 3]) {
      const options = optionsFor(question, 'explorer', seed);
      expect(options).toContain(question.answer);
      expect(new Set(options).size).toBe(options.length);
      expect(optionsFor(question, 'explorer', seed)).toEqual(options);
    }
  });
});

describe('загрузка занятия', () => {
  it('собирает вопросы выбранного уровня и запоминает иконы занятия', async () => {
    const session = { level: 'beginner', collection: 'russian', seed: 555, repeat: false } as const;
    const lesson = await loadRecognitionLesson(icons, session);
    expect(lesson.length).toBeGreaterThan(0);
    for (const item of lesson) expect(item.question.id).toBe(item.icon.recognition!.beginner.id);
    expect(JSON.parse(localStorage.getItem('academy.iconography.lastLesson.v1')!))
      .toEqual(lesson.map((item) => item.icon.id));
  });

  it('повторяет именно названные вопросы — ошибки прошлого занятия', async () => {
    const [first, second] = quizIcons.slice(0, 2);
    const retry = [
      { iconId: first.id, questionId: readRecord(first.id).recognition!.explorer.id },
      { iconId: second.id, questionId: readRecord(second.id).recognition!.beginner.id },
    ];
    const lesson = await loadRecognitionLesson(icons, { level: 'expert', collection: 'russian', seed: 7, repeat: false, retry });
    expect(lesson).toHaveLength(2);
    expect(lesson.map((item) => item.question.id).sort()).toEqual(retry.map((x) => x.questionId).sort());
  });

  it('повторяет накопленные сложные вопросы викторины', async () => {
    const icon = quizIcons[0];
    const question = readRecord(icon.id).recognition!.explorer;
    localStorage.setItem('academy.iconography.progress.v1', JSON.stringify({ difficult: [question.id], answered: 1, correct: 0 }));
    const lesson = await loadRecognitionLesson(icons, { level: 'beginner', collection: 'russian', seed: 2, repeat: true });
    expect(lesson.map((item) => item.question.id)).toEqual([question.id]);
    expect(allRecordQuestions(lesson[0].icon)).toContainEqual(question);
  });
});
