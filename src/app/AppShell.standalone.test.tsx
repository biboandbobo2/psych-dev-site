import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  usePeriods: vi.fn(),
  useClinicalTopics: vi.fn(),
  useGeneralTopics: vi.fn(),
  useDynamicCourseLessons: vi.fn(),
  useAuthSync: vi.fn(),
  useScrollRestoration: vi.fn(),
  appRoutes: vi.fn(),
}));

vi.mock('../hooks/usePeriods', () => ({
  usePeriods: mocks.usePeriods,
}));

vi.mock('../hooks/useClinicalTopics', () => ({
  useClinicalTopics: mocks.useClinicalTopics,
}));

vi.mock('../hooks/useGeneralTopics', () => ({
  useGeneralTopics: mocks.useGeneralTopics,
}));

vi.mock('../hooks/useDynamicCourseLessons', () => ({
  useDynamicCourseLessons: mocks.useDynamicCourseLessons,
}));

vi.mock('../hooks/useAuthSync', () => ({
  useAuthSync: mocks.useAuthSync,
}));

vi.mock('../hooks/useScrollRestoration', () => ({
  useScrollRestoration: mocks.useScrollRestoration,
}));

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { isSuperAdmin: boolean; loading: boolean; user: null }) => unknown) =>
    selector({ isSuperAdmin: false, loading: false, user: null }),
}));

vi.mock('./AppRoutes', () => ({
  AppRoutes: ({ fallback, ...props }: { fallback?: ReactNode }) => {
    mocks.appRoutes(props);
    return <>{fallback ?? <div>no fallback</div>}</>;
  },
}));

import { AppShell } from './AppShell';

describe('AppShell standalone booking route', () => {
  beforeEach(() => {
    mocks.usePeriods.mockReset();
    mocks.useClinicalTopics.mockReset();
    mocks.useGeneralTopics.mockReset();
    mocks.useDynamicCourseLessons.mockReset();
    mocks.appRoutes.mockReset();
  });

  it('renders booking-branded fallback without initializing unrelated content hooks', () => {
    render(
      <MemoryRouter initialEntries={['/booking']}>
        <AppShell />
      </MemoryRouter>
    );

    expect(screen.getByText('Забронировать кабинет')).toBeInTheDocument();
    expect(mocks.usePeriods).not.toHaveBeenCalled();
    expect(mocks.useClinicalTopics).not.toHaveBeenCalled();
    expect(mocks.useGeneralTopics).not.toHaveBeenCalled();
    expect(mocks.useDynamicCourseLessons).not.toHaveBeenCalled();
  });
});
