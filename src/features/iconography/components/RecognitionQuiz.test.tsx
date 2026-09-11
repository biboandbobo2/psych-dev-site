import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary } from '../types';
import { RecognitionQuiz } from './RecognitionQuiz';
import { readProgress } from '../lib/progress';
import { selectRecognitionIcons } from '../lib/recognition';
const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const record = (id: string): IconRecord => JSON.parse(readFileSync(`${base}/records/${id}.json`, 'utf8'));
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => new Response(readFileSync(`${base}/records/${String(url).split('/').at(-1)}`, 'utf8'), { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('recognition first entry', () => {
  it('asks immediately, accepts only one answer, explains it and reveals the detail only afterwards', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Какой это образ?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Начать занятие' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Показать признак' })).not.toBeInTheDocument();
    const correct = screen.getByRole('button', { name: 'Вседержитель (Пантократор)' });
    fireEvent.click(correct); fireEvent.click(correct);
    expect(readProgress().answered).toBe(1);
    expect(screen.getByRole('button', { name: 'Следующая икона' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Показать признак' }));
    expect(screen.getByRole('img', { name: 'Крещатый нимб Христа' })).toBeInTheDocument();
    expect(screen.getByText('Об этой иконе')).toBeInTheDocument();
  });
  it('finishes seven images and repeats the actual failed question at its original level', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
    const lesson = selectRecognitionIcons(icons, 'russian', 0);
    for (let i = 0; i < lesson.length; i++) {
      const q = record(lesson[i].id).recognition!.explorer;
      const choice = await screen.findByRole('button', { name: i === 0 ? q.distractors[0] : q.answer });
      fireEvent.click(choice);
      fireEvent.click(screen.getByRole('button', { name: i === lesson.length - 1 ? 'Завершить занятие' : 'Следующая икона' }));
    }
    expect(await screen.findByRole('heading', { name: 'Теперь знакомые' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Различать по деталям/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить сложное' }));
    const choice = await screen.findByRole('button', { name: 'Вседержитель (Пантократор)' });
    fireEvent.click(choice);
    expect(readProgress().difficult).toEqual([]);
    expect(screen.getByRole('button', { name: 'Завершить занятие' })).toBeInTheDocument();
  });
  it('starts at the middle level with visible controls and allows a simpler question', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1, name: 'Какой это образ?' });
    expect(screen.getByRole('combobox', { name: 'Уровень' })).toHaveValue('explorer');
    expect(screen.getByRole('combobox', { name: 'Традиция' })).toHaveValue('russian');
    fireEvent.change(screen.getByRole('combobox', { name: 'Уровень' }), { target: { value: 'beginner' } });
    expect(await screen.findByRole('button', { name: 'Иисус Христос' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Апостол' })).toBeInTheDocument();
  });
});
