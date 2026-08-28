import { describe, it, expect, beforeEach } from 'vitest';
import { readEditableCoursesClaim, resolveEditableCourses, useAuthStore } from './useAuthStore';

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

/**
 * Права админа на курсы: rules читают claim `editableCourses`, поэтому в UI
 * побеждает он, а Firestore-зеркало adminEditableCourses остаётся фолбэком.
 * Расхождение этих двух источников даёт «кнопка активна, запись отклонена».
 */
describe('useAuthStore — editableCourses из claims', () => {
  it('массив строк → возвращается как есть', () => {
    expect(readEditableCoursesClaim({ editableCourses: ['external-x', 'clinical'] })).toEqual([
      'external-x',
      'clinical',
    ]);
  });

  it('пустой массив в claim → [] (права отозваны, зеркало не должно перебивать)', () => {
    expect(readEditableCoursesClaim({ editableCourses: [] })).toEqual([]);
  });

  it('claim отсутствует → null (используется Firestore-зеркало)', () => {
    expect(readEditableCoursesClaim({ role: 'admin' })).toBeNull();
  });

  it('не-массив в claim → null', () => {
    expect(readEditableCoursesClaim({ editableCourses: 'external-x' })).toBeNull();
  });

  it('мусор внутри массива отфильтровывается', () => {
    expect(readEditableCoursesClaim({ editableCourses: ['ok', 42, null, 'fine'] })).toEqual([
      'ok',
      'fine',
    ]);
  });

  it('setAdminEditableCourses кладёт список в стор', () => {
    useAuthStore.getState().setAdminEditableCourses(['external-x']);
    expect(useAuthStore.getState().adminEditableCourses).toEqual(['external-x']);
    useAuthStore.getState().setAdminEditableCourses([]);
    expect(useAuthStore.getState().adminEditableCourses).toEqual([]);
  });
});

describe('useAuthStore — сведение claim и Firestore-зеркала', () => {
  it('оба источника есть → пересечение (курс появится, только когда его пустят rules)', () => {
    expect(resolveEditableCourses(['a', 'b'], ['b', 'c'])).toEqual(['b']);
  });

  it('права отозвали в Firestore, токен ещё старый → курс уходит из UI сразу', () => {
    expect(resolveEditableCourses(['a', 'b'], ['a'])).toEqual(['a']);
  });

  it('права выдали в Firestore, claim ещё без них → курс появится после обновления токена', () => {
    expect(resolveEditableCourses(['a'], ['a', 'b'])).toEqual(['a']);
  });

  it('claim ещё не пришёл → работает зеркало', () => {
    expect(resolveEditableCourses(null, ['a'])).toEqual(['a']);
  });

  it('зеркало ещё не пришло → работает claim', () => {
    expect(resolveEditableCourses(['a'], null)).toEqual(['a']);
  });

  it('нет ни одного источника → пусто', () => {
    expect(resolveEditableCourses(null, null)).toEqual([]);
  });
});
