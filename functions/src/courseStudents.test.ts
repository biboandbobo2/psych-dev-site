import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firestore mocks ────────────────────────────────────────────

const { state, mockCollection, mockGetAll } = vi.hoisted(() => {
  const state = {
    groups: [] as Array<{ id: string; data: Record<string, unknown> }>,
    users: new Map<string, Record<string, unknown>>(),
    /** Аргументы последнего where по users — проверяем путь map-поля. */
    userWhere: null as [string, string, unknown] | null,
    groupWhere: null as [string, string, unknown] | null,
  };

  const readPath = (data: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, data);

  const mockCollection = vi.fn((name: string) => {
    if (name === 'groups') {
      return {
        where: (field: string, op: string, value: unknown) => {
          state.groupWhere = [field, op, value];
          return {
            get: async () => ({
              docs: state.groups
                .filter((group) => {
                  const granted = group.data.grantedCourses;
                  return Array.isArray(granted) && granted.includes(value);
                })
                .map((group) => ({ id: group.id, data: () => group.data })),
            }),
          };
        },
      };
    }
    if (name === 'users') {
      return {
        doc: (uid: string) => ({ __uid: uid }),
        where: (field: string, op: string, value: unknown) => {
          state.userWhere = [field, op, value];
          return {
            get: async () => ({
              docs: [...state.users.entries()]
                .filter(([, data]) => readPath(data, field) === value)
                .map(([uid, data]) => ({ id: uid, data: () => data })),
            }),
          };
        },
      };
    }
    throw new Error(`unexpected collection ${name}`);
  });

  const mockGetAll = vi.fn(async (...refs: Array<{ __uid: string }>) =>
    refs.map((ref) => ({
      id: ref.__uid,
      exists: state.users.has(ref.__uid),
      data: () => state.users.get(ref.__uid),
    }))
  );

  return { state, mockCollection, mockGetAll };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection, getAll: mockGetAll }),
}));

vi.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  return {
    onCall: (optsOrFn: unknown, fn?: Function) => (typeof optsOrFn === 'function' ? optsOrFn : fn),
    HttpsError,
  };
});

// ── Import after mocks ─────────────────────────────────────────

import { getCourseStudents } from './courseStudents';

// ── Helpers ────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';
const COURSE = 'external-x';

const call = (data: unknown, ctx: Record<string, unknown> = {}) =>
  (getCourseStudents as unknown as Function)({ data, ...ctx });

const superAdminCtx = { auth: { uid: 'sa-uid', token: { email: SUPER_ADMIN_EMAIL } } };
const coAdminCtx = { auth: { uid: 'co-uid', token: { email: 'co@e.com', coAdmin: true } } };
const courseAdminCtx = {
  auth: { uid: 'author-uid', token: { email: 'author@e.com', role: 'admin', editableCourses: [COURSE] } },
};
const otherCourseAdminCtx = {
  auth: { uid: 'other-uid', token: { email: 'other@e.com', role: 'admin', editableCourses: ['external-y'] } },
};
const studentCtx = { auth: { uid: 'st-uid', token: { email: 'st@e.com' } } };

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

beforeEach(() => {
  vi.clearAllMocks();
  state.groups = [];
  state.users.clear();
  state.userWhere = null;
  state.groupWhere = null;
});

// ── Валидация входа ────────────────────────────────────────────

describe('getCourseStudents: валидация courseId', () => {
  it('требует непустую строку', async () => {
    await expect(call({}, superAdminCtx)).rejects.toThrow('courseId обязателен');
    await expect(call({ courseId: '   ' }, superAdminCtx)).rejects.toThrow('courseId обязателен');
    await expect(call({ courseId: 42 }, superAdminCtx)).rejects.toThrow('courseId обязателен');
  });

  it('отбивает точки и слеши в courseId (путь courseAccess.<id>)', async () => {
    await expect(call({ courseId: 'a.b' }, superAdminCtx)).rejects.toThrow('Недопустимый courseId');
    await expect(call({ courseId: '../users' }, superAdminCtx)).rejects.toThrow('Недопустимый courseId');
  });
});

// ── Права ──────────────────────────────────────────────────────

describe('getCourseStudents: права', () => {
  it('гость получает unauthenticated', async () => {
    await expect(call({ courseId: COURSE })).rejects.toThrow('Требуется авторизация');
  });

  it('студент и админ чужого курса получают permission-denied', async () => {
    await expect(call({ courseId: COURSE }, studentCtx)).rejects.toThrow(`Нет прав на курс ${COURSE}`);
    await expect(call({ courseId: COURSE }, otherCourseAdminCtx)).rejects.toThrow(
      `Нет прав на курс ${COURSE}`
    );
  });

  it('админ своего курса, со-админ и super-admin проходят', async () => {
    for (const ctx of [courseAdminCtx, coAdminCtx, superAdminCtx]) {
      const result = await call({ courseId: COURSE }, ctx);
      expect(result).toEqual({ courseId: COURSE, groups: [], individual: [] });
    }
  });
});

// ── Сборка ответа ──────────────────────────────────────────────

describe('getCourseStudents: группировка', () => {
  beforeEach(() => {
    state.groups = [
      { id: 'g-b', data: { name: 'Поток Б', grantedCourses: [COURSE], memberIds: ['u1', 'u-pending'] } },
      { id: 'g-a', data: { name: 'Поток А', grantedCourses: [COURSE], memberIds: ['u2', 'u-ghost'] } },
      { id: 'everyone', data: { name: 'Все', grantedCourses: [COURSE], memberIds: ['u9'] } },
      { id: 'g-sys', data: { name: 'Системная', grantedCourses: [COURSE], isSystem: true, memberIds: ['u9'] } },
      { id: 'g-other', data: { name: 'Чужой поток', grantedCourses: ['external-y'], memberIds: ['u8'] } },
    ];
    state.users.set('u1', {
      displayName: 'Борис',
      email: 'boris@e.com',
      photoURL: 'http://p/1',
      lastLoginAt: ts('2026-01-02T03:04:05.000Z'),
      phone: '+995555000000',
      geminiApiKey: 'secret',
      prefs: { emailBookingConfirmations: true },
      courseAccess: { [COURSE]: true },
    });
    state.users.set('u2', { displayName: 'Анна', email: 'anna@e.com' });
    state.users.set('u-pending', {
      email: 'invited@e.com',
      displayName: 'invited',
      pendingRegistration: true,
      lastLoginAt: null,
      courseAccess: { [COURSE]: true },
    });
    state.users.set('u9', { displayName: 'Из everyone', courseAccess: {} });
    state.users.set('solo', {
      displayName: 'Соло',
      email: 'solo@e.com',
      disabled: true,
      courseAccess: { [COURSE]: true, development: true },
    });
    state.users.set('no-name', { email: 'zzz@e.com', courseAccess: { [COURSE]: true } });
    state.users.set('foreign', { displayName: 'Чужой', courseAccess: { 'external-y': true } });
  });

  it('запрашивает группы по grantedCourses и users по courseAccess.<courseId>', async () => {
    await call({ courseId: COURSE }, courseAdminCtx);
    expect(state.groupWhere).toEqual(['grantedCourses', 'array-contains', COURSE]);
    expect(state.userWhere).toEqual([`courseAccess.${COURSE}`, '==', true]);
  });

  it('исключает everyone и системные группы', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    expect(result.groups.map((g: { id: string }) => g.id)).toEqual(['g-a', 'g-b']);
  });

  it('участник группы не дублируется в individual', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    expect(result.individual.map((s: { uid: string }) => s.uid)).toEqual(['solo', 'no-name']);
  });

  it('pending-приглашение помечено и остаётся в группе', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    const groupB = result.groups.find((g: { id: string }) => g.id === 'g-b');
    const pending = groupB.students.find((s: { uid: string }) => s.uid === 'u-pending');
    expect(pending).toMatchObject({ pendingRegistration: true, lastLoginAt: null });
    expect(groupB.students.find((s: { uid: string }) => s.uid === 'u1').pendingRegistration).toBe(false);
  });

  it('участник без users-документа пропускается', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    const groupA = result.groups.find((g: { id: string }) => g.id === 'g-a');
    expect(groupA.students.map((s: { uid: string }) => s.uid)).toEqual(['u2']);
  });

  it('сортирует группы по имени, студентов — по displayName, безымянных в конец', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    expect(result.groups.map((g: { name: string }) => g.name)).toEqual(['Поток А', 'Поток Б']);
    // Борис vs invited: кириллица и латиница сортируются через ru-локаль
    expect(result.groups[1].students.map((s: { displayName: string }) => s.displayName)).toEqual([
      'Борис',
      'invited',
    ]);
    expect(result.individual.map((s: { displayName: string | null }) => s.displayName)).toEqual([
      'Соло',
      null,
    ]);
  });

  it('отдаёт только поля контракта — ни телефона, ни ключа, ни prefs', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    const student = result.groups.find((g: { id: string }) => g.id === 'g-b').students[0];

    expect(Object.keys(student).sort()).toEqual([
      'disabled',
      'displayName',
      'email',
      'lastLoginAt',
      'pendingRegistration',
      'photoURL',
      'uid',
    ]);
    expect(student).toEqual({
      uid: 'u1',
      displayName: 'Борис',
      email: 'boris@e.com',
      photoURL: 'http://p/1',
      lastLoginAt: '2026-01-02T03:04:05.000Z',
      pendingRegistration: false,
      disabled: false,
    });
  });

  it('переносит disabled из users-документа', async () => {
    const result = await call({ courseId: COURSE }, courseAdminCtx);
    expect(result.individual[0]).toMatchObject({ uid: 'solo', disabled: true });
  });

  it('читает документы участников батчами через getAll', async () => {
    await call({ courseId: COURSE }, courseAdminCtx);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetAll.mock.calls[0]).toHaveLength(4); // u1, u-pending, u2, u-ghost
  });
});
