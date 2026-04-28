import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  usePeriods: vi.fn(),
  useClinicalTopics: vi.fn(),
  useGeneralTopics: vi.fn(),
  useDynamicCourseLessons: vi.fn(),
  useAuthSync: vi.fn(),
  useScrollRestoration: vi.fn(),
  useLoginModal: vi.fn(),
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

vi.mock('../hooks/useLoginModal', () => ({
  useLoginModal: mocks.useLoginModal,
}));

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { isSuperAdmin: boolean; loading: boolean; user: null }) => unknown) =>
    selector({ isSuperAdmin: false, loading: false, user: null }),
}));

vi.mock('../stores/useCourseStore', () => ({
  useCourseStore: (selector: (state: { currentCourse: string | null; setCurrentCourse: (id: string) => void }) => unknown) =>
    selector({ currentCourse: null, setCurrentCourse: () => {} }),
}));

vi.mock('./AppRoutes', () => ({
  AppRoutes: (props: unknown) => {
    mocks.appRoutes(props);
    return <div>app routes</div>;
  },
}));

vi.mock('../components/LoginModal', () => ({
  default: () => <div>login modal</div>,
}));

vi.mock('../components/TelegramOpenInBrowser', () => ({
  default: () => <div>telegram open</div>,
}));

vi.mock('../components/SuperAdminTaskPanel', () => ({
  default: () => <div>super admin panel</div>,
}));

vi.mock('../components/AdminCourseSidebar', () => ({
  default: () => <div>admin sidebar</div>,
}));

vi.mock('../components/StudentCourseSidebar', () => ({
  default: () => <div>student sidebar</div>,
}));

import { AppShell } from './AppShell';

const emptyDynamicLessons = { topics: new Map(), loading: false, error: null, reload: () => {} };
const emptyMap = new Map();

function setHappyPathDefaults() {
  mocks.usePeriods.mockReturnValue({ periods: [{ id: 'p1', period: 'p1', label: 'P1' }], loading: false, error: null, refresh: () => {} });
  mocks.useClinicalTopics.mockReturnValue({ topics: emptyMap, loading: false, error: null });
  mocks.useGeneralTopics.mockReturnValue({ topics: emptyMap, loading: false, error: null });
  mocks.useDynamicCourseLessons.mockReturnValue(emptyDynamicLessons);
  mocks.useLoginModal.mockReturnValue({ isOpen: false, openModal: () => {}, closeModal: () => {} });
}

describe('AppShell', () => {
  beforeEach(() => {
    mocks.usePeriods.mockReset();
    mocks.useClinicalTopics.mockReset();
    mocks.useGeneralTopics.mockReset();
    mocks.useDynamicCourseLessons.mockReset();
    mocks.useLoginModal.mockReset();
    mocks.appRoutes.mockReset();
  });

  it('skips unrelated content hooks for standalone booking routes', () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/booking']}>
          <AppShell />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByText('app routes')).toBeInTheDocument();
    expect(mocks.usePeriods).not.toHaveBeenCalled();
    expect(mocks.useClinicalTopics).not.toHaveBeenCalled();
    expect(mocks.useGeneralTopics).not.toHaveBeenCalled();
    expect(mocks.useDynamicCourseLessons).not.toHaveBeenCalled();
  });

  it('skips unrelated content hooks for standalone warm_springs2 route', () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/warm_springs2']}>
          <AppShell />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByText('app routes')).toBeInTheDocument();
    expect(mocks.usePeriods).not.toHaveBeenCalled();
  });

  it('renders LoadingSplash while content hooks load on main path', () => {
    setHappyPathDefaults();
    mocks.usePeriods.mockReturnValue({ periods: [], loading: true, error: null, refresh: () => {} });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/home']}>
          <AppShell />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(mocks.appRoutes).not.toHaveBeenCalled();
  });

  it('renders ErrorState when usePeriods returns an error', () => {
    setHappyPathDefaults();
    mocks.usePeriods.mockReturnValue({ periods: [], loading: false, error: new Error('boom'), refresh: () => {} });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/home']}>
          <AppShell />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByText(/boom/i)).toBeInTheDocument();
    expect(mocks.appRoutes).not.toHaveBeenCalled();
  });

  it('renders AppRoutes with built period maps on main path', () => {
    setHappyPathDefaults();

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/home']}>
          <AppShell />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByText('app routes')).toBeInTheDocument();
    expect(mocks.appRoutes).toHaveBeenCalledTimes(1);
    const props = mocks.appRoutes.mock.calls[0][0] as {
      periodMap: Map<string, unknown>;
      clinicalTopicsMap: Map<string, unknown>;
      generalTopicsMap: Map<string, unknown>;
      isSuperAdmin: boolean;
    };
    expect(props.periodMap).toBeInstanceOf(Map);
    expect(props.periodMap.has('p1')).toBe(true);
    expect(props.clinicalTopicsMap).toBeInstanceOf(Map);
    expect(props.generalTopicsMap).toBeInstanceOf(Map);
    expect(props.isSuperAdmin).toBe(false);
  });
});
