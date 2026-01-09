import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminUsers from '../AdminUsers';

vi.mock('../../hooks/useAllUsers', () => ({
  useAllUsers: () => ({
    users: [
      {
        uid: 'u1',
        role: 'student',
        email: 'student@example.com',
        displayName: 'Student',
        photoURL: null,
        createdAt: null,
        lastLoginAt: { toDate: () => new Date('2024-01-01') },
      },
      {
        uid: 'u2',
        role: 'admin',
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

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { uid: 'u3', email: 'super@example.com' },
    isSuperAdmin: true,
  }),
}));

describe('AdminUsers statistics', () => {
  it('отображает счётчики пользователей и ролей', () => {
    render(<AdminUsers />);

    expect(
      screen.getByText(/Всего:/)
    ).toHaveTextContent('Всего: 3 (Админов: 2, Студентов: 1, Гостей: 0)');
    expect(screen.getByText('Все (3)')).toBeInTheDocument();
    expect(screen.getByText('Гости (0)')).toBeInTheDocument();
    expect(screen.getByText('Студенты (1)')).toBeInTheDocument();
    expect(screen.getByText('Администраторы (2)')).toBeInTheDocument();
  });
});
