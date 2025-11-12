import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../src/stores/useAuthStore';

const resetState = () => {
  useAuthStore.setState({
    user: null,
    loading: true,
    userRole: null,
    isStudent: false,
    isAdmin: false,
    isSuperAdmin: false,
  });
};

afterEach(() => {
  resetState();
});

describe('useAuthStore role derivation', () => {
  it('помечает супер-админа и админа', () => {
    const store = useAuthStore.getState();
    store.setUserRole('super-admin');
    expect(store.isSuperAdmin).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(store.isStudent).toBe(false);

    store.setUserRole('admin');
    expect(store.isSuperAdmin).toBe(false);
    expect(store.isAdmin).toBe(true);
    expect(store.isStudent).toBe(false);
  });

  it('оставляет студента только студентом', () => {
    const store = useAuthStore.getState();
    store.setUserRole('student');
    expect(store.isStudent).toBe(true);
    expect(store.isAdmin).toBe(false);
    expect(store.isSuperAdmin).toBe(false);
  });
});
