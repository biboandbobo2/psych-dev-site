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

    const button = screen.getByTestId('user-menu-search-button');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByTestId('combined-search-drawer')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('combined-search-drawer')).not.toBeInTheDocument();
  });
});
