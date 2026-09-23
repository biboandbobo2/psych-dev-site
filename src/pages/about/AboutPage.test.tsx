import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AboutPage from './AboutPage';
import { ABOUT_TABS } from './aboutContent';
import { PARTNERS } from './partnersContent';

vi.mock('../../hooks/useAboutPageContent', () => ({
  useAboutPageContent: () => ({
    content: { version: 1, tabs: ABOUT_TABS, partners: PARTNERS },
    loading: false,
    error: null,
  }),
}));

vi.mock('../admin/pages/useProjectsList', () => ({
  useProjectsList: () => ({ items: [], loading: false, error: null }),
}));

function SearchProbe() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function renderAt(url: string) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/about"
            element={
              <>
                <AboutPage />
                <SearchProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

async function expectActiveTab(label: string) {
  const panel = await screen.findByRole('tabpanel');
  expect(within(panel).getByRole('heading', { level: 2 })).toHaveTextContent(label);
  expect(screen.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
}

describe('AboutPage tabs', () => {
  it('switches tab on click and writes it to the URL', async () => {
    renderAt('/about');
    await expectActiveTab('Проект «Академия»');

    fireEvent.click(screen.getByRole('tab', { name: 'Партнёры' }));

    await expectActiveTab('Партнёры');
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=partners');
  });

  it('opens tab from the URL and drops the param for the default tab', async () => {
    renderAt('/about?tab=history');
    await expectActiveTab('История Академии и платформы');

    fireEvent.click(screen.getByRole('tab', { name: 'Проект «Академия»' }));

    await expectActiveTab('Проект «Академия»');
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });
});
