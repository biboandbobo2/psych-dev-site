import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserMenu from '../UserMenu';
import { useAuthStore } from '../../stores/useAuthStore';
import type { User } from 'firebase/auth';

const mockUser = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'User',
  photoURL: null,
} as unknown as User;

describe('UserMenu research search entry', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: mockUser,
      loading: false,
      isAdmin: false,
      isSuperAdmin: false,
    });
  });

  it('открывает и закрывает Drawer по кнопке и Esc', () => {
    render(
      <MemoryRouter>
        <UserMenu user={mockUser} />
      </MemoryRouter>
    );

    const buttons = screen.getAllByTestId('user-menu-search-button');
    expect(buttons.length).toBeGreaterThan(0);

    fireEvent.click(buttons[0]);
    expect(screen.getByRole('heading', { name: /по сайту и статьям/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: /по сайту и статьям/i })).not.toBeInTheDocument();
  });
});
