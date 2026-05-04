import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';

/**
 * Регрессионный тест на derivation флагов в setUserRole / setCoAdminFlag.
 * Эти флаги — единственный источник правды для всех клиентских гейтов
 * (RequireAdmin, RequireCoAdmin, маршруты, UserMenu). Поломка тут
 * незаметно «откроет» лишним пользователям функционал админа.
 *
 * isCoAdmin — параллельный флаг, не выводится из userRole, но super-admin
 * всегда автоматически получает true.
 */
describe('useAuthStore — derivation флагов', () => {
  beforeEach(() => {
    useAuthStore.setState({
      userRole: null,
      isAdmin: false,
      isSuperAdmin: false,
      isCoAdmin: false,
    });
  });

  it('null + coAdmin=false → все флаги false', () => {
    useAuthStore.getState().setUserRole(null);
    useAuthStore.getState().setCoAdminFlag(false);
    const s = useAuthStore.getState();
    expect(s.userRole).toBeNull();
    expect(s.isAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
    expect(s.isCoAdmin).toBe(false);
  });

  it("'admin' + coAdmin=false → isAdmin, без isSuperAdmin/isCoAdmin", () => {
    useAuthStore.getState().setUserRole('admin');
    useAuthStore.getState().setCoAdminFlag(false);
    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(true);
    expect(s.isSuperAdmin).toBe(false);
    expect(s.isCoAdmin).toBe(false);
  });

  it("'admin' + coAdmin=true → admin и co-admin одновременно (параллельные роли)", () => {
    useAuthStore.getState().setUserRole('admin');
    useAuthStore.getState().setCoAdminFlag(true);
    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(true);
    expect(s.isCoAdmin).toBe(true);
    expect(s.isSuperAdmin).toBe(false);
  });

  it("обычный пользователь + coAdmin=true → только isCoAdmin", () => {
    useAuthStore.getState().setUserRole(null);
    useAuthStore.getState().setCoAdminFlag(true);
    const s = useAuthStore.getState();
    expect(s.isCoAdmin).toBe(true);
    expect(s.isAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
  });

  it("'super-admin' → все три флага true (включая isCoAdmin автоматически)", () => {
    useAuthStore.getState().setUserRole('super-admin');
    const s = useAuthStore.getState();
    expect(s.isSuperAdmin).toBe(true);
    expect(s.isAdmin).toBe(true);
    expect(s.isCoAdmin).toBe(true);
  });

  it("super-admin не теряет isCoAdmin даже при setCoAdminFlag(false)", () => {
    useAuthStore.getState().setUserRole('super-admin');
    useAuthStore.getState().setCoAdminFlag(false);
    expect(useAuthStore.getState().isCoAdmin).toBe(true);
  });

  it('переход admin → null корректно сбрасывает role-флаги, но coAdmin сохраняется', () => {
    useAuthStore.getState().setUserRole('admin');
    useAuthStore.getState().setCoAdminFlag(true);
    useAuthStore.getState().setUserRole(null);
    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(false);
    expect(s.isSuperAdmin).toBe(false);
    // coAdmin не сбрасывается при смене role — он управляется отдельно.
    expect(s.isCoAdmin).toBe(true);
  });

  it('явное снятие: setCoAdminFlag(false) сбрасывает флаг для не-super-admin', () => {
    useAuthStore.getState().setUserRole('admin');
    useAuthStore.getState().setCoAdminFlag(true);
    useAuthStore.getState().setCoAdminFlag(false);
    const s = useAuthStore.getState();
    expect(s.isAdmin).toBe(true);
    expect(s.isCoAdmin).toBe(false);
  });
});
