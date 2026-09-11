import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import type { IconRecord, IconSummary } from '../types';
import { Catalog } from './Catalog';
import { BackLink } from './BackLink';
import { PassportFacts } from './Passport';
import { Learn } from './Learn';
const icons: IconSummary[] = JSON.parse(readFileSync('public/iconography/catalog.json', 'utf8'));
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>; }
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('catalogue and reading navigation', () => {
  it('returns to the same filters, page and icon after opening a result', () => {
    const start = '/iconography/catalog?tradition=Русская&page=2';
    render(<MemoryRouter initialEntries={[start]}><Location /><Routes>
      <Route path="/iconography/catalog" element={<Catalog icons={icons} />} />
      <Route path="/iconography/icon/:id" element={<BackLink />} />
    </Routes></MemoryRouter>);
    const card = screen.getAllByRole('link').find((x) => x.getAttribute('href')?.includes('/icon/'))!;
    const id = card.getAttribute('href')!.split('/').at(-1);
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('link', { name: 'Назад к коллекции' }));
    expect(screen.getByTestId('location')).toHaveTextContent(`${start}#${id}`);
    expect(screen.getByRole('combobox', { name: 'Традиция' })).toHaveValue('Русская');
  });
  it('uses the catalogue for a direct entry and rejects an external return destination', () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/iconography/icon/ru-6226762', state: { returnTo: 'https://example.com', returnLabel: 'Outside' } }]}><BackLink /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Назад к коллекции' })).toHaveAttribute('href', '/iconography/catalog');
  });
  it('links an attributed school and returns from it to the same icon', () => {
    const icon: IconRecord = JSON.parse(readFileSync('public/iconography/records/ru-35409809.json', 'utf8'));
    render(<MemoryRouter initialEntries={['/iconography/icon/ru-35409809']}><Location /><Routes>
      <Route path="/iconography/icon/:id" element={<PassportFacts icon={icon} />} />
      <Route path="/iconography/schools/:id" element={<BackLink />} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('link', { name: 'Псков' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/schools/pskov');
    fireEvent.click(screen.getByRole('link', { name: 'Назад к иконе' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/icon/ru-35409809');
  });
  it('reveals a church example, then changes question and image without carrying over the answer', () => {
    render(<MemoryRouter><Learn icons={icons} /></MemoryRouter>);
    expect(screen.getByRole('img').getAttribute('src')).toContain('ru-95156246');
    fireEvent.click(screen.getByRole('button', { name: 'Показать объяснение' }));
    expect(screen.getByText(/Когда видите несколько фигур/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Дальше' }));
    expect(screen.queryByText(/Когда видите несколько фигур/)).not.toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('src')).toContain('ru-95156254');
    expect(screen.getByRole('button', { name: 'Показать объяснение' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Праотеческий ряд' })).not.toBeInTheDocument();
  });
});
