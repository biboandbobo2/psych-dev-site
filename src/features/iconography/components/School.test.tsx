import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import type { IconSchool, IconSummary } from '../types';
import { School } from './School';
import { BackLink } from './BackLink';

const icons: IconSummary[] = JSON.parse(readFileSync('public/iconography/catalog.json', 'utf8'));
const schools: IconSchool[] = JSON.parse(readFileSync('public/iconography/schools.json', 'utf8'));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

const renderSchool = (id: string) => render(
  <MemoryRouter initialEntries={[`/iconography/schools/${id}`]}><Location /><Routes>
    <Route path="/iconography/schools/:id" element={<School icons={icons} />} />
    <Route path="/iconography/icon/:id" element={<BackLink />} />
  </Routes></MemoryRouter>);

const exampleLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('.ico-school-examples a')];

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(readFileSync('public/iconography/schools.json', 'utf8'), { status: 200 }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('статья о школе', () => {
  it('показывает примеры секций ссылками на паспорта и подписью, что смотреть', async () => {
    renderSchool('novgorod');
    await screen.findByRole('heading', { level: 1, name: 'Новгородская школа' });

    const listed = schools.find((x) => x.id === 'novgorod')!.sections.flatMap((x) => x.examples ?? []);
    expect(listed.length).toBeGreaterThan(0);
    expect(exampleLinks().map((link) => link.getAttribute('href')))
      .toEqual(listed.map((example) => `/iconography/icon/${example.iconId}`));
    for (const example of listed) expect(screen.getByText(example.note)).toBeInTheDocument();
  });

  it('возвращает из паспорта примера обратно к статье', async () => {
    renderSchool('cretan');
    await screen.findByRole('heading', { level: 1, name: 'Критская школа' });

    fireEvent.click(exampleLinks()[0]);
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/icon/gr-43296015');
    fireEvent.click(screen.getByRole('link', { name: 'Назад к школе' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/schools/cretan');
  });
});

describe('данные статей о школах', () => {
  it('ссылаются только на иконы своей школы', () => {
    const byId = new Map(icons.map((icon) => [icon.id, icon]));
    for (const school of schools) {
      for (const example of school.sections.flatMap((section) => section.examples ?? [])) {
        expect(byId.get(example.iconId)?.schoolId, `${school.id} → ${example.iconId}`).toBe(school.id);
      }
    }
  });
});
