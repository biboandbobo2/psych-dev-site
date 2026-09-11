import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary, Question } from '../types';
import { Practice } from './Practice';
import { readProgress } from '../lib/progress';

const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const icon: IconRecord = JSON.parse(readFileSync(`${base}/records/cma-168322.json`, 'utf8'));
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Всё, что может прозвучать в режиме «одна икона»: вопросы паспорта плюс углублённый вопрос викторины. */
const wholeIconPool: Question[] = [...icon.questions, ...(icon.recognition ? [icon.recognition.expert] : [])];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const name = String(url).split('/').at(-1)!;
    return new Response(readFileSync(`${base}/records/${name}`, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const lessonSize = () => Number(screen.getByText(/Вопрос 1 из /).textContent!.match(/из (\d+)/)![1]);

describe('занятия практики', () => {
  it('проходит занятие по одной иконе, разбирает ошибку и открывает паспорт с источниками', async () => {
    render(<MemoryRouter initialEntries={['/iconography/practice?icon=cma-168322']}><Practice icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    await screen.findByText(/Вопрос 1 из /);

    const total = lessonSize();
    expect(total).toBeGreaterThanOrEqual(3);
    const prompts: string[] = [];
    let firstMistake: { chosen: string; answer: string } | undefined;

    for (let i = 0; i < total; i += 1) {
      const prompt = screen.getByRole('heading', { level: 1 }).textContent!;
      prompts.push(prompt);
      const question = wholeIconPool.find((x) => x.prompt === prompt)!;
      const chosen = i === 0 ? question.distractors[0] : question.answer;
      if (i === 0) firstMistake = { chosen, answer: question.answer };
      fireEvent.click(screen.getByRole('button', { name: new RegExp(escape(chosen)) }));
      expect(await screen.findByRole('heading', { level: 2, name: i === 0 ? 'Неверно' : 'Верно' })).toBeInTheDocument();
      if (i === 0) {
        expect(screen.getByText(new RegExp(`Вы выбрали «${escape(chosen)}»`))).toBeInTheDocument();
        expect(screen.getByText(/^Верно:/)).toHaveTextContent(`Верно: ${question.answer}`);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    }

    // Формулировки в занятии не повторяются.
    expect(new Set(prompts).size).toBe(total);
    expect(await screen.findByRole('heading', { level: 1, name: `Верно ${total - 1} из ${total}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Что стоит пересмотреть' })).toBeInTheDocument();
    expect(screen.getByText(`Вы выбрали «${firstMistake!.chosen}». Верно: ${firstMistake!.answer}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: `Полный паспорт: ${icon.title}` })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(escape(icon.sources[0].label)) })).toHaveAttribute('href', icon.sources[0].url);
    expect(readProgress()).toMatchObject({ answered: total, correct: total - 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('на углублённом уровне прячет варианты до самопроверки и не спрашивает свободный ответ', async () => {
    const question = icon.questions[0];
    localStorage.setItem('academy.iconography.progress.v1', JSON.stringify({ difficult: [question.id], answered: 1, correct: 0 }));
    render(<MemoryRouter initialEntries={['/iconography/practice?repeat=1']}><Practice icons={icons} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Повторить сложное \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText(/вопросы викторины, и вопросы практики/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Углублённый/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    await screen.findByRole('heading', { level: 1, name: question.prompt });

    expect(screen.queryByRole('button', { name: new RegExp(escape(question.answer)) })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Сначала вспомните ответ, затем откройте варианты.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Открыть варианты' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(escape(question.answer)) }));
    await waitFor(() => expect(readProgress().difficult).toEqual([]));
  });

  it('учит иконостасу, не загружая ни одной репродукции', async () => {
    render(<MemoryRouter initialEntries={['/iconography/practice?topic=iconostasis']}><Practice icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    await screen.findByRole('heading', { name: /Какой ряд описан/ });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('берёт для праздников праздничные паспорта и общие карточки', async () => {
    render(<MemoryRouter initialEntries={['/iconography/practice?topic=feast']}><Practice icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    await screen.findByText(/Вопрос 1 из /);
    const requested = vi.mocked(fetch).mock.calls.map((call) => String(call[0]).split('/').at(-1)!.replace('.json', ''));
    expect(requested.length).toBeGreaterThan(0);
    expect(requested.length).toBeLessThanOrEqual(8);
    const feastGroups = new Set(['annunciation', 'nativity', 'presentation', 'baptism', 'transfiguration', 'lazarus',
      'entry', 'crucifixion', 'resurrection', 'ascension', 'pentecost', 'dormition', 'mary-entry', 'noli']);
    for (const id of requested) expect(feastGroups.has(icons.find((x) => x.id === id)!.recognitionGroup!)).toBe(true);
  });

  it('предлагает только визуальные темы и общие уровни викторины', () => {
    render(<MemoryRouter initialEntries={['/iconography/practice']}><Practice icons={icons} /></MemoryRouter>);
    for (const gone of ['Традиции', 'Века и периоды', 'Авторы и мастерские', 'Музеи и собрания']) {
      expect(screen.queryByRole('radio', { name: new RegExp(escape(gone)) })).not.toBeInTheDocument();
    }
    for (const level of ['Начальный', 'Средний', 'Углублённый']) {
      expect(screen.getByRole('radio', { name: new RegExp(level) })).toBeInTheDocument();
    }
  });
});
