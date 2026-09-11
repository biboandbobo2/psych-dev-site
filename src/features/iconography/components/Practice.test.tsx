import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconRecord, IconSummary } from '../types';
import { Practice } from './Practice';
import { readProgress } from '../lib/progress';
const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const icon: IconRecord = JSON.parse(readFileSync(`${base}/records/cma-168322.json`, 'utf8'));
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const name = String(url).split('/').at(-1)!;
    return new Response(readFileSync(`${base}/records/${name}`, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('visitor learning journeys', () => {
  it('completes a whole-icon lesson, explains an error and exposes a sourced full passport', async () => {
    render(<MemoryRouter initialEntries={['/iconography/practice?icon=cma-168322']}><Practice icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    for (let i = 0; i < icon.questions.length; i++) {
      const question = icon.questions[i];
      await screen.findByRole('heading', { name: question.prompt });
      const answer = i === 0 ? question.distractors[0] : question.answer;
      fireEvent.click(screen.getByRole('button', { name: new RegExp(escape(answer)) }));
      expect(await screen.findByRole('heading', { name: i === 0 ? 'Разберём вместе' : 'Да, вы заметили верно' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    }
    expect(await screen.findByRole('heading', { name: 'Теперь вы видите больше' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Полный паспорт: Богоматерь Умиление' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Музейный каталог Cleveland/ })).toHaveAttribute('href', icon.sources[0].url);
    expect(readProgress()).toEqual({ difficult: [icon.questions[0].id], answered: 8, correct: 7 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps expert options hidden until recall and removes a resolved difficult question', async () => {
    const q = icon.questions[0];
    localStorage.setItem('academy.iconography.progress.v1', JSON.stringify({ difficult: [q.id], answered: 1, correct: 0 }));
    render(<MemoryRouter initialEntries={['/iconography/practice?repeat=1']}><Practice icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: /Знаток/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    await screen.findByRole('heading', { name: q.prompt });
    expect(screen.queryByRole('button', { name: new RegExp(escape(q.answer)) })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Открыть варианты' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(escape(q.answer)) }));
    await waitFor(() => expect(readProgress().difficult).toEqual([]));
  });
  it('can teach iconostasis without fetching any artwork record', async () => {
    render(<MemoryRouter initialEntries={['/iconography/practice?topic=iconostasis']}><Practice icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Начать занятие' }));
    await screen.findByRole('heading', { name: /Какой ряд описан/ });
    expect(fetch).not.toHaveBeenCalled();
  });
});
