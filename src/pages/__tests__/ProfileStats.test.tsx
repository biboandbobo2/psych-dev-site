import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it, vi } from 'vitest';
import AdminUsers from '../AdminUsers';

vi.mock('../../hooks/useAllUsers', () => ({
  useAllUsers: () => ({
    users: [
      {
        uid: 'u1',
        role: null,
        courseAccess: { development: true },
        email: 'student@example.com',
        displayName: 'Student',
        photoURL: null,
        createdAt: null,
        lastLoginAt: { toDate: () => new Date('2024-01-01') },
      },
      {
        uid: 'u2',
        role: 'admin',
        adminEditableCourses: ['development'],
        email: 'admin@example.com',
        displayName: 'Admin',
        photoURL: null,
        createdAt: null,
        lastLoginAt: { toDate: () => new Date('2024-01-02') },
      },
      {
        uid: 'u3',
        role: 'super-admin',
        email: 'super@example.com',
        displayName: 'Super',
        photoURL: null,
        createdAt: null,
        lastLoginAt: { toDate: () => new Date('2024-01-03') },
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useAllGroups', () => ({
  useAllGroups: () => ({ groups: [], loading: false, error: null }),
}));

vi.mock('../../hooks/useCourses', () => ({
  useCourses: () => ({
    courses: [
      { id: 'development', name: 'Психология развития', icon: '🧠', order: 0, published: true },
      { id: 'clinical', name: 'Клиническая психология', icon: '🩺', order: 1, published: true },
    ],
    loading: false,
  }),
}));

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { uid: 'u3', email: 'super@example.com' },
    isAdmin: true,
    isSuperAdmin: true,
    isCoAdmin: true,
  }),
}));

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsers />
      </MemoryRouter>
    </HelmetProvider>
  );

describe('AdminUsers statistics', () => {
  it('сводка в подзаголовке считает роли по эффективному доступу', () => {
    renderPage();

    expect(
      screen.getByText('3 человека · 1 студент · 1 администратор курса · 0 гостей')
    ).toBeInTheDocument();
  });

  it('показывает всех пользователей и счётчик показанных', () => {
    renderPage();

    expect(screen.getByText('student@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Показано 3 из 3')).toBeInTheDocument();
  });
});
