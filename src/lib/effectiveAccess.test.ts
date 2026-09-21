import { describe, it, expect } from 'vitest';
import type { Group } from '../types/groups';
import {
  computeEffectiveAccess,
  computeEffectiveAccessWithIndex,
  buildGroupIndex,
  type EffectiveAccessUser,
} from './effectiveAccess';

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-1',
    name: 'Группа 1',
    memberIds: [],
    grantedCourses: [],
    announcementAdminIds: [],
    ...overrides,
  };
}

describe('computeEffectiveAccess', () => {
  it('личный доступ формирует personal-источник и попадает в paidCourseIds', () => {
    const result = computeEffectiveAccess(
      { uid: 'u1', role: null, courseAccess: { development: true } },
      [],
      []
    );
    expect(result.courses).toEqual({ development: [{ kind: 'personal' }] });
    expect(result.paidCourseIds).toEqual(['development']);
    expect(result.freeCourseIds).toEqual([]);
    expect(result.displayRole).toBe('student');
  });

  it('доступ только через системную группу everyone → guest с freeCourseIds', () => {
    const everyone = makeGroup({
      id: 'everyone',
      name: 'Все',
      isSystem: true,
      memberIds: ['u1'],
      grantedCourses: ['general'],
    });
    const result = computeEffectiveAccess({ uid: 'u1', role: null }, [everyone], []);
    expect(result.freeCourseIds).toEqual(['general']);
    expect(result.paidCourseIds).toEqual([]);
    expect(result.displayRole).toBe('guest');
    expect(result.groups).toEqual([{ id: 'everyone', name: 'Все', isSystem: true }]);
  });

  it('личный + группа на один курс дают два источника', () => {
    const stream = makeGroup({
      id: 'stream-1',
      name: 'Поток 1',
      memberIds: ['u1'],
      grantedCourses: ['clinical'],
    });
    const result = computeEffectiveAccess(
      { uid: 'u1', role: null, courseAccess: { clinical: true } },
      [stream],
      []
    );
    expect(result.courses.clinical).toHaveLength(2);
    expect(result.courses.clinical).toEqual([
      { kind: 'personal' },
      { kind: 'group', groupId: 'stream-1', groupName: 'Поток 1', isSystem: false },
    ]);
    expect(result.paidCourseIds).toEqual(['clinical']);
  });

  it('несистемная группа даёт платный доступ → student', () => {
    const stream = makeGroup({
      id: 'stream-2',
      name: 'Поток 2',
      memberIds: ['u1'],
      grantedCourses: ['general'],
    });
    const result = computeEffectiveAccess({ uid: 'u1', role: null }, [stream], []);
    expect(result.paidCourseIds).toEqual(['general']);
    expect(result.displayRole).toBe('student');
  });

  it('admin со студенческим доступом: displayRole admin, но courses заполнены', () => {
    const result = computeEffectiveAccess(
      { uid: 'admin-1', role: 'admin', courseAccess: { clinical: true } },
      [],
      []
    );
    expect(result.displayRole).toBe('admin');
    expect(result.courses).toEqual({ clinical: [{ kind: 'personal' }] });
    expect(result.paidCourseIds).toEqual(['clinical']);
  });

  it('super-admin: displayRole super-admin независимо от courseAccess', () => {
    const result = computeEffectiveAccess({ uid: 'sa-1', role: 'super-admin' }, [], []);
    expect(result.displayRole).toBe('super-admin');
    expect(result.courses).toEqual({});
  });

  it('courseIds ограничивает ключи в courses/paid/free', () => {
    const result = computeEffectiveAccess(
      { uid: 'u1', role: null, courseAccess: { clinical: true, general: true } },
      [],
      ['clinical']
    );
    expect(Object.keys(result.courses)).toEqual(['clinical']);
    expect(result.paidCourseIds).toEqual(['clinical']);
  });

  it('пустой courseIds не ограничивает ключи — попадают все встреченные курсы', () => {
    const result = computeEffectiveAccess(
      { uid: 'u1', role: null, courseAccess: { clinical: true, general: true } },
      [],
      []
    );
    expect(Object.keys(result.courses).sort()).toEqual(['clinical', 'general']);
  });

  it('uid, которого нет ни в одной группе, не получает групповой доступ', () => {
    const stream = makeGroup({ id: 'stream-3', memberIds: ['other-uid'], grantedCourses: ['clinical'] });
    const result = computeEffectiveAccess({ uid: 'pending-uid', role: null }, [stream], []);
    expect(result.courses).toEqual({});
    expect(result.groups).toEqual([]);
    expect(result.displayRole).toBe('guest');
  });

  it('игнорирует courseAccess === false и undefined как отсутствие доступа', () => {
    const result = computeEffectiveAccess(
      { uid: 'u1', role: null, courseAccess: { clinical: false, general: undefined } },
      [],
      []
    );
    expect(result.courses).toEqual({});
    expect(result.displayRole).toBe('guest');
  });
});

describe('buildGroupIndex + computeEffectiveAccessWithIndex', () => {
  it('даёт тот же результат, что computeEffectiveAccess с прямым перебором групп', () => {
    const everyone = makeGroup({
      id: 'everyone',
      name: 'Все',
      isSystem: true,
      memberIds: ['u1', 'u2'],
      grantedCourses: ['general'],
    });
    const stream = makeGroup({
      id: 'stream-1',
      name: 'Поток 1',
      memberIds: ['u1'],
      grantedCourses: ['clinical'],
    });
    const groups = [everyone, stream];
    const user: EffectiveAccessUser = {
      uid: 'u1',
      role: null,
      courseAccess: { development: true },
    };

    const direct = computeEffectiveAccess(user, groups, []);
    const index = buildGroupIndex(groups);
    const viaIndex = computeEffectiveAccessWithIndex(user, index, []);

    expect(viaIndex).toEqual(direct);
  });

  it('pending-uid отсутствует в индексе → пустой список групп', () => {
    const stream = makeGroup({ id: 'stream-3', memberIds: ['other-uid'], grantedCourses: ['clinical'] });
    const index = buildGroupIndex([stream]);
    const result = computeEffectiveAccessWithIndex({ uid: 'pending-uid', role: null }, index, []);
    expect(result.groups).toEqual([]);
    expect(result.courses).toEqual({});
  });
});
