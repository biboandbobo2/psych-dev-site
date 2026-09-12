import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Difficulty, IconRecord, IconSummary } from '../types';
import { RecognitionQuiz } from './RecognitionQuiz';
import { readProgress } from '../lib/progress';

const base = resolve(process.cwd(), 'public/iconography');
const icons: IconSummary[] = JSON.parse(readFileSync(`${base}/catalog.json`, 'utf8'));
const record = (id: string): IconRecord => JSON.parse(readFileSync(`${base}/records/${id}.json`, 'utf8'));
const quizIcons = icons.filter((icon) => icon.recognitionGroup);

/** Подборка занятия случайна, поэтому тест берёт ровно столько групп, сколько нужно сценарию. */
function distinctGroups(list: IconSummary[], count: number): IconSummary[] {
  const seen = new Set<string>();
  const selected: IconSummary[] = [];
  for (const icon of list) {
    if (seen.has(icon.recognitionGroup!)) continue;
    seen.add(icon.recognitionGroup!);
    selected.push(icon);
    if (selected.length === count) break;
  }
  return selected;
}

const russian = quizIcons.filter((icon) => icon.tradition === 'Русская');
const trio = distinctGroups(russian, 3);
// Подборка по умолчанию — русская, поэтому иконы с отметкой берём из неё же.
const withDetail = distinctGroups(russian.filter((icon) => record(icon.id).recognition?.detail), 2);

/** Какая икона сейчас на экране — по адресу репродукции, а не по тексту вопроса. */
function currentIconId(): string {
  const image = document.querySelector('.ico-recognition-image img');
  return image!.getAttribute('src')!.split('/').at(-1)!.replace(/-\d+\.webp$/, '');
}
const currentQuestion = (level: Difficulty = 'explorer') => record(currentIconId()).recognition![level];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    new Response(readFileSync(`${base}/records/${String(url).split('/').at(-1)}`, 'utf8'), { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

/** Проходит занятие целиком; `wrong` — номера вопросов, на которых нарочно ошибаемся. */
async function playLesson(total: number, wrong: number[] = []) {
  const played: { chosen: string; answer: string; iconId: string }[] = [];
  for (let i = 0; i < total; i += 1) {
    await screen.findByRole('heading', { level: 1 });
    const question = currentQuestion();
    const chosen = wrong.includes(i) ? question.distractors[0] : question.answer;
    played.push({ chosen, answer: question.answer, iconId: currentIconId() });
    fireEvent.click(screen.getByRole('button', { name: chosen }));
    fireEvent.click(screen.getByRole('button', { name: i === total - 1 ? 'Завершить занятие' : 'Следующая икона' }));
  }
  return played;
}

describe('вход в викторину', () => {
  it('объясняет, что это, и сразу задаёт вопрос', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
    expect(screen.getByText(/Викторина по узнаванию образов/)).toBeInTheDocument();
    expect(screen.getByText('Как устроены уровни')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Уровень' })).toHaveValue('explorer');
    expect(screen.getByRole('combobox', { name: 'Традиция' })).toHaveValue('russian');

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(currentQuestion().prompt);
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByRole('button', { name: 'Начать занятие' })).not.toBeInTheDocument();
  });

  it('не начинает всем посетителям одно и то же занятие', async () => {
    const starts = new Set<string>();
    for (let i = 0; i < 4; i += 1) {
      render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
      await screen.findByRole('heading', { level: 1 });
      starts.add(currentIconId());
      cleanup();
    }
    expect(starts.size).toBeGreaterThan(1);
  });

  it('меняет вопрос вместе с уровнем', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    fireEvent.change(screen.getByRole('combobox', { name: 'Уровень' }), { target: { value: 'beginner' } });
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(currentQuestion('beginner').prompt);
    for (const option of [currentQuestion('beginner').answer, ...currentQuestion('beginner').distractors]) {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    }
  });
});

describe('ответ и разбор', () => {
  it('принимает только один ответ, разбирает выбранный вариант и показывает верный', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    const question = currentQuestion();
    const wrong = question.distractors[0];

    const button = screen.getByRole('button', { name: wrong });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(readProgress()).toMatchObject({ answered: 1, correct: 0, difficult: [question.id] });

    expect(screen.getByRole('heading', { level: 2, name: 'Неверно' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Вы выбрали «${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}»`))).toBeInTheDocument();
    expect(screen.getByText(/^Верный ответ:/)).toHaveTextContent(`Верный ответ: «${question.answer}»`);
    expect(screen.getByText(question.explanation)).toBeInTheDocument();
    if (question.rationale?.[wrong]) expect(screen.getByText(new RegExp(question.rationale[wrong].slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
  });

  it('на верный ответ отвечает объяснением без разбора чужого варианта', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    const question = currentQuestion();
    fireEvent.click(screen.getByRole('button', { name: question.answer }));
    expect(screen.getByRole('heading', { level: 2, name: 'Верно' })).toBeInTheDocument();
    expect(screen.queryByText(/Вы выбрали/)).not.toBeInTheDocument();
    expect(screen.getByText(question.explanation)).toBeInTheDocument();
  });

  it('не показывает в карточке иконы строку-заглушку о собрании', async () => {
    const unknownMuseum = icons.find((icon) => icon.id === 'ru-24341211')!;
    render(<MemoryRouter><RecognitionQuiz icons={[unknownMuseum]} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: currentQuestion().answer }));
    fireEvent.click(screen.getByText('Об этой иконе'));
    // В паспорте такая строка скрыта — в викторине правило то же.
    expect(screen.queryByText(/Собрание не установлено/)).not.toBeInTheDocument();
    expect(screen.getByText(`${unknownMuseum.title}. ${unknownMuseum.period}.`)).toBeInTheDocument();
  });

  it('показывает отметку признака только на углублённом вопросе и только после ответа', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={withDetail} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Показать признак' })).not.toBeInTheDocument();
    // Рамка описана под углублённый вопрос: на среднем её не предлагают даже после ответа.
    fireEvent.click(screen.getByRole('button', { name: currentQuestion().answer }));
    expect(screen.queryByRole('button', { name: 'Показать признак' })).not.toBeInTheDocument();
    expect(screen.getByText('Об этой иконе')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Уровень' }), { target: { value: 'expert' } });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Показать признак' })).not.toBeInTheDocument();
    const detail = record(currentIconId()).recognition!.detail!;
    fireEvent.click(screen.getByRole('button', { name: currentQuestion('expert').answer }));

    const toggle = screen.getByRole('button', { name: 'Показать признак' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('img', { name: detail.label })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скрыть отметку' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('итог занятия', () => {
  it('показывает счёт, разбор каждой иконы и повторяет ошибки этого занятия', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    const played = await playLesson(trio.length, [0]);

    expect(await screen.findByRole('heading', { level: 1, name: `Верно ${trio.length - 1} из ${trio.length}` })).toBeInTheDocument();
    expect(screen.getAllByText('Верно')).toHaveLength(trio.length - 1);
    expect(screen.getByText('Неверно')).toBeInTheDocument();
    expect(screen.getByText(`Вы выбрали «${played[0].chosen}». Верный ответ: «${played[0].answer}»`)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Паспорт и источники/ })).toHaveLength(trio.length);
    for (const { iconId } of played) expect(document.querySelector(`a[href="/iconography/icon/${iconId}"]`)).toBeTruthy();
    expect(screen.getByText(/Всего ответов: 3, верных: 2/)).toHaveTextContent('В «сложном» сейчас 1 вопрос викторины и практики.');
    expect(screen.getByRole('heading', { name: 'Если хочется глубже' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Повторить ошибки этого занятия' }));
    await screen.findByRole('heading', { level: 1 });
    expect(currentIconId()).toBe(played[0].iconId);
    expect(screen.getByLabelText('Икона 1 из 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: played[0].answer }));
    expect(readProgress().difficult).toEqual([]);
    expect(screen.getByRole('button', { name: 'Завершить занятие' })).toBeInTheDocument();
  });

  it('сбрасывает накопленный прогресс с подтверждением', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    await playLesson(trio.length, [0]);
    await screen.findByRole('heading', { level: 1, name: /Верно \d+ из/ });
    expect(readProgress().answered).toBe(trio.length);

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить прогресс' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(readProgress().answered).toBe(trio.length);

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить прогресс' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить прогресс' }));
    expect(readProgress()).toEqual({ difficult: [], answered: 0, correct: 0 });
    expect(localStorage.getItem('academy.iconography.lastLessons.v2')).toBeNull();
    expect(localStorage.getItem('academy.iconography.seen.v1')).toBeNull();
    expect(screen.getByText(/Всего ответов: 0, верных: 0/)).toHaveTextContent('В «сложном» сейчас 0 вопросов');
    expect(screen.queryByRole('button', { name: 'Сбросить прогресс' })).not.toBeInTheDocument();
  });

  it('предлагает повторить накопленное сложное и начать новое занятие', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    await playLesson(trio.length, [1]);
    await screen.findByRole('heading', { level: 1, name: /Верно \d+ из/ });
    expect(screen.getByRole('button', { name: 'Повторить сложное' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ещё иконы' }));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByLabelText(`Икона 1 из ${trio.length}`)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Уровень' })).toBeInTheDocument();
  });
});

describe('размер подборки', () => {
  it('предупреждает о маленькой греческой подборке перед вопросом и на итоге — по одному разу', async () => {
    const greek = quizIcons.filter((icon) => icon.tradition === 'Греческая' || icon.tradition.includes('критская'));
    expect(greek.length).toBeGreaterThan(7);
    expect(greek.length).toBeLessThan(12);
    const note = new RegExp(`В подборке «Греческая и критская» всего ${greek.length} икон`);

    render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Традиция' }), { target: { value: 'greek' } });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByText(note)).toHaveLength(1);

    const total = Number(/из (\d+)/.exec(screen.getByLabelText(/^Икона 1 из /).getAttribute('aria-label')!)![1]);
    await playLesson(total);
    await screen.findByRole('heading', { level: 1, name: /Верно \d+ из/ });
    expect(screen.getAllByText(note)).toHaveLength(1);
  });

  it('о большой русской подборке не предупреждает', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={icons} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/повторы неизбежны/)).not.toBeInTheDocument();
  });
});

describe('настройки во время занятия', () => {
  it('не сбрасывает занятие молча: селекты прячутся, смена требует подтверждения', async () => {
    render(<MemoryRouter><RecognitionQuiz icons={trio} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: currentQuestion().answer }));
    fireEvent.click(screen.getByRole('button', { name: 'Следующая икона' }));

    expect(screen.queryByRole('combobox', { name: 'Уровень' })).not.toBeInTheDocument();
    expect(screen.getByText(/Средний · Русская традиция/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'изменить' }));
    expect(screen.getByText(/Текущее занятие завершится/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить занятие' }));
    expect(screen.queryByRole('combobox', { name: 'Уровень' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Икона 2 из ${trio.length}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'изменить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Всё равно изменить' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Уровень' }), { target: { value: 'beginner' } });
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(currentQuestion('beginner').prompt);
    expect(screen.getByLabelText(`Икона 1 из ${trio.length}`)).toBeInTheDocument();
  });
});
