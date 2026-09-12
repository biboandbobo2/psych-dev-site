import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import type { GlossaryTerm, IconSummary } from '../types';
import { Glossary } from './Glossary';
import { GlossaryProvider, WithGlossary } from './Term';

const icons: IconSummary[] = JSON.parse(readFileSync('public/iconography/catalog.json', 'utf8'));
const glossary: GlossaryTerm[] = JSON.parse(readFileSync('public/iconography/glossary.json', 'utf8'));

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    new Response(readFileSync(`public/iconography/${String(url).split('/iconography/').at(-1)}`, 'utf8'), { status: 200 }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderIn = (node: React.ReactNode, entry = '/iconography/glossary') =>
  render(<HelmetProvider><MemoryRouter initialEntries={[entry]}>{node}</MemoryRouter></HelmetProvider>);

describe('всплывающее пояснение термина', () => {
  it('открывается по клику, показывает определение и ссылку на глоссарий', async () => {
    renderIn(<GlossaryProvider><p><WithGlossary text="Ступни стоят на позёме доски." /></p></GlossaryProvider>);

    const button = await screen.findByRole('button', { name: 'позёме' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('позём');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-describedby', tip.id);
    expect(screen.getByRole('link', { name: 'В глоссарии →' })).toHaveAttribute('href', '/iconography/glossary#pozyom');

    fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('закрывается по Escape', async () => {
    renderIn(<GlossaryProvider><p><WithGlossary text="Крещатый нимб положен только Христу." /></p></GlossaryProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Крещатый нимб' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('держит открытым только одно пояснение', async () => {
    renderIn(<GlossaryProvider><p><WithGlossary text="Хитон и гиматий." /></p></GlossaryProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Хитон' }));
    fireEvent.click(screen.getByRole('button', { name: 'гиматий' }));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });
});

describe('страница глоссария', () => {
  it('выводит все термины по алфавиту с якорями и примером', async () => {
    renderIn(<Glossary icons={icons} />);

    await screen.findByRole('heading', { level: 1, name: 'Слова, которые здесь встречаются' });
    const shown = screen.getAllByRole('term').map((node) => node.textContent);
    expect(shown).toHaveLength(glossary.length);
    expect(shown).toEqual([...shown].sort((a, b) => a!.localeCompare(b!, 'ru')));

    const srednik = glossary.find((x) => x.id === 'srednik')!;
    await waitFor(() => expect(document.getElementById('srednik')).toHaveTextContent(srednik.term));
    const example = icons.find((icon) => icon.id === srednik.example!.iconId)!;
    expect(screen.getAllByRole('link', { name: example.title })[0])
      .toHaveAttribute('href', `/iconography/icon/${example.id}`);
  });
});
