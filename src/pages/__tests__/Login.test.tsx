import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../Login';

let mockAuth: { user: { email: string } | null; loading: boolean; isAdmin: boolean };

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ ...mockAuth, signInWithGoogle: vi.fn() }),
}));

function CurrentLocation() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderLogin(from?: { pathname: string; search: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: from ? { from } : null }]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<CurrentLocation />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Login redirect', () => {
  beforeEach(() => {
    mockAuth = { user: { email: 'student@example.com' }, loading: false, isAdmin: false };
  });

  it('студента без from ведёт на /home, а не в админку', () => {
    renderLogin();
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it('админа без from ведёт в /admin', () => {
    mockAuth.isAdmin = true;
    renderLogin();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin');
  });

  it('возвращает на from вместе с query', () => {
    renderLogin({ pathname: '/disorder-table', search: '?course=osnovy-patopsihologii-2y-potok' });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/disorder-table?course=osnovy-patopsihologii-2y-potok'
    );
  });

  it('пока роль грузится, никуда не уводит', () => {
    mockAuth.loading = true;
    renderLogin();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(screen.getByText('Вы уже вошли')).toBeInTheDocument();
  });
});
