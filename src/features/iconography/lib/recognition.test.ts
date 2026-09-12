import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary } from '../types';
import { traditionGroup } from './catalog';
import { optionsFor } from './quiz';
import { allRecordQuestions, collectionSize, loadRecognitionLesson, recentIconIds, selectRecognitionIcons } from './recognition';

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
    expect(next).toHaveLength(previous.length);
    // Группа из одной работы уходит в конец очереди, поэтому занятие целиком новое.
    expect(next.filter((icon) => ids(previous).includes(icon.id))).toEqual([]);
  });

  it('не берёт больше двух работ одного ансамбля', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const collection of ['russian', 'all'] as const) {
        const lesson = selectRecognitionIcons(icons, collection, seed);
        expect(lesson.filter((icon) => icon.schoolId === 'kirillov').length).toBeLessThanOrEqual(2);
      }
    }
    // В подборке всё ещё семь работ: ансамбль заменяется другой группой, а не выбрасывается.
    expect(selectRecognitionIcons(icons, 'russian', 4242)).toHaveLength(7);
  });

  it('«Все традиции» набирают группы по кругу, а не тянутся к русским', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const lesson = selectRecognitionIcons(icons, 'all', seed);
      const traditions = lesson.map((icon) => traditionGroup(icon.tradition));
      // Четыре группы традиций на семь слотов: круг даёт каждой не больше двух мест.
      expect(new Set(traditions).size).toBe(4);
      expect(traditions.filter((name) => name === 'Русская').length).toBeLessThanOrEqual(2);
    }
  });

  it('не повторяет работы трёх последних занятий, пока в группе есть замена', () => {
    const lessons = [selectRecognitionIcons(icons, 'russian', 5)];
    for (const seed of [6, 7, 8]) lessons.push(selectRecognitionIcons(icons, 'russian', seed, lessons.flat().map((x) => x.id)));
    const seenBefore = new Set(lessons.slice(0, 3).flat().map((icon) => icon.id));
    for (const icon of lessons[3]) {
      const variants = quizIcons.filter((x) => x.tradition === 'Русская' && x.recognitionGroup === icon.recognitionGroup);
      // Повтор допустим только там, где вся группа уже была показана.
      if (variants.some((x) => !seenBefore.has(x.id))) expect(seenBefore.has(icon.id)).toBe(false);
    }
  });

  it('при равных условиях берёт работу, которую видели реже', () => {
    const variants = quizIcons.filter((icon) => icon.tradition === 'Русская' && icon.recognitionGroup === 'mary');
    expect(variants.length).toBeGreaterThan(1);
    const seen = Object.fromEntries(variants.slice(1).map((icon) => [icon.id, 4]));
    for (let seed = 1; seed <= 12; seed += 1) {
      const chosen = selectRecognitionIcons(icons, 'russian', seed, [], seen).find((icon) => icon.recognitionGroup === 'mary');
      if (chosen) expect(chosen.id).toBe(variants[0].id);
    }
  });

  it('считает размер подборки: грузинская и греческая — не больше семи работ', () => {
    expect(collectionSize(icons, 'russian')).toBeGreaterThan(7);
    expect(collectionSize(icons, 'georgian')).toBeLessThanOrEqual(7);
    expect(collectionSize(icons, 'all')).toBe(quizIcons.length);
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
    expect(recentIconIds()).toEqual(lesson.map((item) => item.icon.id));
    expect(JSON.parse(localStorage.getItem('academy.iconography.seen.v1')!))
      .toEqual(Object.fromEntries(lesson.map((item) => [item.icon.id, 1])));
  });

  it('после итога «Ещё иконы» не повторяет ни одной работы прошлого занятия', async () => {
    const first = await loadRecognitionLesson(icons, { level: 'explorer', collection: 'russian', seed: 101, repeat: false });
    // Занятие записано уже при формировании, а не на экране итога.
    expect(recentIconIds()).toEqual(first.map((item) => item.icon.id));
    const second = await loadRecognitionLesson(icons, { level: 'explorer', collection: 'russian', seed: 202, repeat: false });
    expect(second.length).toBeGreaterThan(0);
    const before = new Set(first.map((item) => item.icon.id));
    expect(second.filter((item) => before.has(item.icon.id))).toEqual([]);
  });

  it('помнит три последних занятия и забывает четвёртое от конца', async () => {
    const played: string[][] = [];
    for (const seed of [11, 22, 33, 44]) {
      const lesson = await loadRecognitionLesson(icons, { level: 'explorer', collection: 'russian', seed, repeat: false });
      played.push(lesson.map((item) => item.icon.id));
    }
    const remembered = recentIconIds();
    for (const id of [...played[1], ...played[2], ...played[3]]) expect(remembered).toContain(id);
    const later = new Set([...played[1], ...played[2], ...played[3]]);
    for (const id of played[0]) if (!later.has(id)) expect(remembered).not.toContain(id);
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
