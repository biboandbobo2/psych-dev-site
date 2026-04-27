import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../src/stores/useAuthStore';

const resetState = () => {
  useAuthStore.setState({
    user: null,
    loading: true,
    userRole: null,
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
    expect(useAuthStore.getState().isSuperAdmin).toBe(true);
    expect(useAuthStore.getState().isAdmin).toBe(true);

    store.setUserRole('admin');
    expect(useAuthStore.getState().isSuperAdmin).toBe(false);
    expect(useAuthStore.getState().isAdmin).toBe(true);
  });

  it('сбрасывает флаги для студентов и гостей (role=null)', () => {
    const store = useAuthStore.getState();
    // После сужения UserRole до 'admin' | 'super-admin' студенты и гости —
    // это userRole === null. Флагов isStudent/isGuest в сторе нет (их роль
    // вычисляется через computeDisplayRole от userRole + courseAccess).
    store.setUserRole('admin');
    store.setUserRole(null);
    expect(useAuthStore.getState().isAdmin).toBe(false);
    expect(useAuthStore.getState().isSuperAdmin).toBe(false);
    expect(useAuthStore.getState().userRole).toBe(null);
  });
});
