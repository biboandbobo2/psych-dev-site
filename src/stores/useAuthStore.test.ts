import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';

/**
 * Регрессионный тест на derivation флагов в setUserRole.
 * Эти флаги — единственный источник правды для всех клиентских гейтов
 * (RequireAdmin, RequireCoAdmin, маршруты, UserMenu). Поломка тут
 * незаметно «откроет» лишним пользователям функционал админа.
 */
describe('useAuthStore.setUserRole — derivation флагов', () => {
  beforeEach(() => {
    useAuthStore.setState({
      userRole: null,
      isAdmin: false,
      isSuperAdmin: false,
      isCoAdmin: false,
    });
  });

  it('null → все флаги false', () => {
    useAuthStore.getState().setUserRole(null);
    const s = useAuthStore.getState();
    expect(s.userRole).toBeNull();
    expect(s.isAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
    expect(s.isCoAdmin).toBe(false);
  });

  it("'admin' → isAdmin, без isSuperAdmin/isCoAdmin", () => {
    useAuthStore.getState().setUserRole('admin');
    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(true);
    expect(s.isSuperAdmin).toBe(false);
    expect(s.isCoAdmin).toBe(false);
  });

  it("'co-admin' → только isCoAdmin (НЕ admin, НЕ super-admin)", () => {
    useAuthStore.getState().setUserRole('co-admin');
    const s = useAuthStore.getState();
    expect(s.isCoAdmin).toBe(true);
    expect(s.isAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
  });

  it("'super-admin' → все три флага true (включает admin и co-admin)", () => {
    useAuthStore.getState().setUserRole('super-admin');
    const s = useAuthStore.getState();
    expect(s.isSuperAdmin).toBe(true);
    expect(s.isAdmin).toBe(true);
    expect(s.isCoAdmin).toBe(true);
  });

  it('переход admin → null корректно сбрасывает флаги', () => {
    useAuthStore.getState().setUserRole('admin');
    useAuthStore.getState().setUserRole(null);
    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(false);
    expect(s.isCoAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
  });

  it('переход super-admin → co-admin: isAdmin/isSuperAdmin спадают, isCoAdmin остаётся', () => {
    useAuthStore.getState().setUserRole('super-admin');
    useAuthStore.getState().setUserRole('co-admin');
    const s = useAuthStore.getState();
    expect(s.isCoAdmin).toBe(true);
    expect(s.isAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
  });
});
