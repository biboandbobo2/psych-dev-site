import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firestore / Auth mocks ─────────────────────────────────────

const {
  state, userRef, listDocRef, mockCollection, mockGetUserByEmail,
} = vi.hoisted(() => {
  const state = {
    courses: [] as string[],
    listDocs: [] as unknown[],
    emailQueryResults: new Map<string, unknown>(),
    userRefs: new Map<string, { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }>(),
  };
  const userRef = (uid: string) => {
    if (!state.userRefs.has(uid)) {
      state.userRefs.set(uid, {
        get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
        set: vi.fn(async () => {}),
        delete: vi.fn(async () => {}),
      });
    }
    return state.userRefs.get(uid)!;
  };
  const listDocRef = { id: 'list-1', set: vi.fn(async () => {}) };
  const mockCollection = vi.fn((name: string) => {
    if (name === 'courses') {
      return { get: async () => ({ docs: state.courses.map((id) => ({ id })) }) };
    }
    if (name === 'studentEmailLists') {
      return {
        doc: () => listDocRef,
        orderBy: () => ({ limit: () => ({ get: async () => ({ docs: state.listDocs }) }) }),
      };
    }
    if (name === 'users') {
      return {
        doc: userRef,
        where: (_field: string, _op: string, email: string) => ({
          limit: () => ({
            get: async () => state.emailQueryResults.get(email) ?? { empty: true, docs: [] },
          }),
        }),
      };
    }
    throw new Error(`unexpected collection ${name}`);
  });
  const mockGetUserByEmail = vi.fn();
  return { state, userRef, listDocRef, mockCollection, mockGetUserByEmail };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUserByEmail: mockGetUserByEmail }),
}));

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    default: { https: { onCall: (fn: Function) => fn, HttpsError }, logger },
    https: { onCall: (fn: Function) => fn, HttpsError },
    logger,
  };
});

// ── Import after mocks ─────────────────────────────────────────

import { bulkEnrollStudents, getStudentEmailLists, saveStudentEmailList } from './bulkEnrollment';
import { toPendingUid } from './lib/shared';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function superAdminCtx(uid = 'sa-uid') {
  return { auth: { uid, token: { email: SUPER_ADMIN_EMAIL } } };
}

function authUserNotFound() {
  return Object.assign(new Error('user not found'), { code: 'auth/user-not-found' });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.courses = [];
  state.listDocs = [];
  state.emailQueryResults.clear();
  state.userRefs.clear();
  mockGetUserByEmail.mockRejectedValue(authUserNotFound());
});

// ── Auth checks ─────────────────────────────────────────────

describe('bulkEnrollment auth checks', () => {
  it('all three callables reject unauthenticated calls', async () => {
    await expect((getStudentEmailLists as Function)({}, {})).rejects.toThrow('Authentication required');
    await expect((saveStudentEmailList as Function)({}, {})).rejects.toThrow('Authentication required');
    await expect((bulkEnrollStudents as Function)({}, {})).rejects.toThrow('Authentication required');
  });

  it('all three callables reject non-super-admin', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'user@example.com' } } };
    await expect((getStudentEmailLists as Function)({}, ctx)).rejects.toThrow('Only super-admin');
    await expect((saveStudentEmailList as Function)({}, ctx)).rejects.toThrow('Only super-admin');
    await expect((bulkEnrollStudents as Function)({}, ctx)).rejects.toThrow('Only super-admin');
  });
});

// ── getStudentEmailLists ────────────────────────────────────

describe('getStudentEmailLists', () => {
  it('maps list docs with fallbacks for name/emailCount/updatedAt', async () => {
    state.listDocs = [
      {
        id: 'l1',
        data: () => ({
          name: 'Поток 1',
          emails: ['a@test.com', 42, 'b@test.com'],
          emailCount: 5,
          updatedAt: { toMillis: () => 1234 },
        }),
      },
      { id: 'l2', data: () => ({ emails: 'not-an-array' }) },
    ];

    const result = await (getStudentEmailLists as Function)({}, superAdminCtx());

    expect(result.lists).toEqual([
      { id: 'l1', name: 'Поток 1', emails: ['a@test.com', 'b@test.com'], emailCount: 5, updatedAtMs: 1234 },
      { id: 'l2', name: 'Без названия', emails: [], emailCount: 0, updatedAtMs: null },
    ]);
  });
});

// ── saveStudentEmailList ────────────────────────────────────

describe('saveStudentEmailList', () => {
  it('requires a non-empty name', async () => {
    await expect(
      (saveStudentEmailList as Function)({ name: '  ', emails: ['a@test.com'] }, superAdminCtx()),
    ).rejects.toThrow('List name is required');
  });

  it('requires at least one valid email', async () => {
    await expect(
      (saveStudentEmailList as Function)({ name: 'X', emails: ['not-an-email'] }, superAdminCtx()),
    ).rejects.toThrow('At least one valid email is required');
  });

  it('saves normalized deduped emails and author metadata', async () => {
    const result = await (saveStudentEmailList as Function)(
      { name: ' Мой список ', emails: [' A@Test.com ', 'a@test.com', 'b@test.com'] },
      superAdminCtx(),
    );

    expect(result).toEqual({ success: true, listId: 'list-1' });
    const payload = listDocRef.set.mock.calls[0][0];
    expect(payload.name).toBe('Мой список');
    expect(payload.emails).toEqual(['a@test.com', 'b@test.com']);
    expect(payload.emailCount).toBe(2);
    expect(payload.createdBy).toBe('sa-uid');
    expect(payload.createdByEmail).toBe(SUPER_ADMIN_EMAIL);
  });
});

// ── bulkEnrollStudents ──────────────────────────────────────

describe('bulkEnrollStudents input validation', () => {
  it('rejects when no valid emails', async () => {
    await expect(
      (bulkEnrollStudents as Function)({ emails: ['bogus'], courseIds: ['development'] }, superAdminCtx()),
    ).rejects.toThrow('Provide at least one valid email');
  });

  it('rejects when no courses selected', async () => {
    await expect(
      (bulkEnrollStudents as Function)({ emails: ['a@test.com'], courseIds: [] }, superAdminCtx()),
    ).rejects.toThrow('Select at least one course');
  });

  it('rejects more than 1000 emails', async () => {
    const emails = Array.from({ length: 1001 }, (_, i) => `u${i}@test.com`);
    await expect(
      (bulkEnrollStudents as Function)({ emails, courseIds: ['development'] }, superAdminCtx()),
    ).rejects.toThrow('Too many emails');
  });

  it('rejects course ids unknown to core list and courses collection', async () => {
    state.courses = ['custom-course'];
    await expect(
      (bulkEnrollStudents as Function)({ emails: ['a@test.com'], courseIds: ['bogus'] }, superAdminCtx()),
    ).rejects.toThrow('Invalid course ids: bogus');
  });

  it('accepts core courses and dynamic courses from Firestore', async () => {
    state.courses = ['custom-course'];
    const result = await (bulkEnrollStudents as Function)(
      { emails: ['a@test.com'], courseIds: ['development', 'custom-course'] },
      superAdminCtx(),
    );
    expect(result.success).toBe(true);
  });
});

describe('bulkEnrollStudents enrollment paths', () => {
  it('updates existing Firestore user: guest→student, merges courseAccess, deletes pending doc', async () => {
    const email = 'exists@test.com';
    const existingRef = { set: vi.fn(async () => {}) };
    state.emailQueryResults.set(email, {
      empty: false,
      docs: [{ ref: existingRef, data: () => ({ role: 'guest', courseAccess: { old: true, broken: 'x' } }) }],
    });

    const result = await (bulkEnrollStudents as Function)(
      { emails: [email], courseIds: ['development'] },
      superAdminCtx(),
    );

    expect(result).toMatchObject({ success: true, updatedExisting: 1, createdPending: 0, totalProcessed: 1 });
    const payload = existingRef.set.mock.calls[0][0];
    expect(payload.role).toBe('student');
    // non-boolean courseAccess values отфильтрованы, новый курс добавлен
    expect(payload.courseAccess).toEqual({ old: true, development: true });
    expect(payload.roleUpdatedBy).toBe('sa-uid');
    expect(existingRef.set.mock.calls[0][1]).toEqual({ merge: true });
    expect(userRef(toPendingUid(email)).delete).toHaveBeenCalled();
  });

  it('preserves admin/super-admin role of existing user', async () => {
    const email = 'admin@test.com';
    const existingRef = { set: vi.fn(async () => {}) };
    state.emailQueryResults.set(email, {
      empty: false,
      docs: [{ ref: existingRef, data: () => ({ role: 'admin' }) }],
    });

    await (bulkEnrollStudents as Function)({ emails: [email], courseIds: ['development'] }, superAdminCtx());

    expect(existingRef.set.mock.calls[0][0].role).toBe('admin');
  });

  it('resolves Auth user without Firestore doc and writes users/{authUid}', async () => {
    const email = 'authonly@test.com';
    mockGetUserByEmail.mockResolvedValue({ uid: 'auth-1', displayName: 'Auth User', photoURL: 'http://p' });

    const result = await (bulkEnrollStudents as Function)(
      { emails: [email], courseIds: ['development'] },
      superAdminCtx(),
    );

    expect(result).toMatchObject({ updatedExisting: 1, createdPending: 0 });
    const payload = userRef('auth-1').set.mock.calls[0][0];
    expect(payload).toMatchObject({
      uid: 'auth-1',
      email,
      displayName: 'Auth User',
      role: 'student',
      courseAccess: { development: true },
    });
    expect(userRef(toPendingUid(email)).delete).toHaveBeenCalled();
  });

  it('creates pending doc when user is unknown to Firestore and Auth', async () => {
    const email = 'newbie@test.com';

    const result = await (bulkEnrollStudents as Function)(
      { emails: [email], courseIds: ['development'] },
      superAdminCtx(),
    );

    expect(result).toMatchObject({ updatedExisting: 0, createdPending: 1 });
    const pendingUid = toPendingUid(email);
    const payload = userRef(pendingUid).set.mock.calls[0][0];
    expect(payload).toMatchObject({
      uid: pendingUid,
      email,
      displayName: 'newbie',
      role: 'student',
      pendingRegistration: true,
      invitedBy: 'sa-uid',
      courseAccess: { development: true },
    });
  });

  it('wraps unexpected Auth errors into internal error', async () => {
    mockGetUserByEmail.mockRejectedValue(Object.assign(new Error('quota'), { code: 'auth/too-many-requests' }));

    await expect(
      (bulkEnrollStudents as Function)({ emails: ['x@test.com'], courseIds: ['development'] }, superAdminCtx()),
    ).rejects.toThrow('Failed to resolve user x@test.com');
  });

  it('requires list name when saveList enabled', async () => {
    await expect(
      (bulkEnrollStudents as Function)(
        { emails: ['a@test.com'], courseIds: ['development'], saveList: { enabled: true, name: ' ' } },
        superAdminCtx(),
      ),
    ).rejects.toThrow('List name is required when saveList is enabled');
  });

  it('saves email list when saveList enabled with name', async () => {
    const result = await (bulkEnrollStudents as Function)(
      { emails: ['a@test.com'], courseIds: ['development'], saveList: { enabled: true, name: 'Поток 2' } },
      superAdminCtx(),
    );

    expect(result.savedListId).toBe('list-1');
    const payload = listDocRef.set.mock.calls[0][0];
    expect(payload.name).toBe('Поток 2');
    expect(payload.emails).toEqual(['a@test.com']);
  });
});
