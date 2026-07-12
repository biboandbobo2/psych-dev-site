import { describe, it, expect, vi, beforeEach } from 'vitest';

// Импорт './index' тянет весь граф функций: v2-моки для мигрированных модулей,
// мок firebase-functions/v1 — для gcalSync (пачка 5) и onUserCreate.

// ── Mocks ───────────────────────────────────────────────────────

const {
  refs, refFor, mockCollection, mockSetCustomUserClaims, mockGetUser, mockUpdateUser,
} = vi.hoisted(() => {
  const refs = new Map<string, { set: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }>();
  const refFor = (path: string) => {
    if (!refs.has(path)) {
      refs.set(path, {
        set: vi.fn(async () => {}),
        update: vi.fn(async () => {}),
        delete: vi.fn(async () => {}),
        get: vi.fn(async () => ({ exists: false, data: () => ({}) })),
      });
    }
    return refs.get(path)!;
  };
  const mockCollection = vi.fn((name: string) => ({
    doc: (id: string) => refFor(`${name}/${id}`),
    where: () => ({ get: async () => ({ docs: [], size: 0, empty: true }) }),
    get: async () => ({ docs: [] }),
  }));
  return {
    refs,
    refFor,
    mockCollection,
    mockSetCustomUserClaims: vi.fn(),
    mockGetUser: vi.fn(),
    mockUpdateUser: vi.fn(),
  };
});

vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection, doc: (path: string) => refFor(path), settings: vi.fn() }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TS__',
    delete: () => '__DELETE__',
    arrayUnion: (v: unknown) => ({ __arrayUnion: v }),
    arrayRemove: (v: unknown) => ({ __arrayRemove: v }),
  },
  Timestamp: { now: () => ({ toMillis: () => 0 }) },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    setCustomUserClaims: mockSetCustomUserClaims,
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    getUserByEmail: vi.fn(),
    listUsers: vi.fn(async () => ({ users: [], pageToken: undefined })),
  }),
}));

vi.mock('firebase-functions/v1', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const scheduleChain = () => ({
    timeZone: () => ({ onRun: (fn: Function) => fn }),
    onRun: (fn: Function) => fn,
  });
  const api = {
    https: { onCall: (fn: Function) => fn, onRequest: (fn: Function) => fn, HttpsError },
    logger,
    firestore: { document: () => ({ onWrite: (fn: Function) => fn }) },
    auth: { user: () => ({ onCreate: (fn: Function) => fn }) },
    pubsub: {
      schedule: scheduleChain,
      topic: () => ({ onPublish: (fn: Function) => fn }),
    },
    runWith: () => ({ pubsub: { schedule: scheduleChain } }),
  };
  return { default: api, ...api };
});

vi.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  return {
    onCall: (optsOrFn: unknown, fn?: Function) => (typeof optsOrFn === 'function' ? optsOrFn : fn),
    onRequest: (optsOrFn: unknown, fn?: Function) => (typeof optsOrFn === 'function' ? optsOrFn : fn),
    HttpsError,
  };
});

vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

vi.mock('./lib/adminSeedCode.js', () => ({
  getAdminSeedCode: vi.fn(async () => 'valid-seed-code'),
}));

vi.mock('./lib/debug.js', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
  debugWarn: vi.fn(),
}));

// ── Import after mocks ─────────────────────────────────────────

import { seedAdmin, setRole, toggleUserDisabled } from './index';
import { getAdminSeedCode } from './lib/adminSeedCode.js';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function authedCtx(uid = 'caller-1', token: Record<string, unknown> = { email: 'caller@test.com' }) {
  return { auth: { uid, token } };
}

beforeEach(() => {
  vi.clearAllMocks();
  refs.clear();
  vi.mocked(getAdminSeedCode).mockResolvedValue('valid-seed-code');
  mockGetUser.mockResolvedValue({ email: 'target@test.com', customClaims: { role: 'admin' } });
});

// ── seedAdmin ───────────────────────────────────────────────

describe('seedAdmin', () => {
  it('requires authentication (uid + email)', async () => {
    await expect((seedAdmin as Function)({ data: { seedCode: 'x' } })).rejects.toThrow('Login required');
  });

  it('rejects wrong seed code', async () => {
    await expect(
      (seedAdmin as Function)({ data: { seedCode: 'wrong' }, ...authedCtx() }),
    ).rejects.toThrow('Invalid code');
  });

  it('rejects when seed code is not configured', async () => {
    vi.mocked(getAdminSeedCode).mockResolvedValue(null as never);
    await expect(
      (seedAdmin as Function)({ data: { seedCode: 'valid-seed-code' }, ...authedCtx() }),
    ).rejects.toThrow('Invalid code');
  });

  it('grants admin role: writes admins/{uid} and sets claims', async () => {
    mockGetUser.mockResolvedValue({ customClaims: { role: 'admin' } });

    const result = await (seedAdmin as Function)({ data: { seedCode: 'valid-seed-code' }, ...authedCtx('new-admin') });

    expect(refFor('admins/new-admin').set).toHaveBeenCalledWith(
      { email: 'caller@test.com', createdAt: '__SERVER_TS__' },
      { merge: true },
    );
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('new-admin', { role: 'admin' });
    expect(result).toEqual({ ok: true, claims: { role: 'admin' } });
  });
});

// ── setRole ─────────────────────────────────────────────────

describe('setRole', () => {
  const adminCtx = (uid = 'admin-1') => authedCtx(uid, { email: 'admin@test.com', role: 'admin' });

  it('requires authentication', async () => {
    await expect((setRole as Function)({ data: { targetUid: 'u1', role: 'admin' } })).rejects.toThrow(
      'Authentication required',
    );
  });

  it('rejects non-admin caller', async () => {
    await expect(
      (setRole as Function)({ data: { targetUid: 'u1', role: 'admin' }, ...authedCtx() }),
    ).rejects.toThrow('Only admins can manage roles');
  });

  it('allows caller with super-admin claim (регресс: раньше блокировался)', async () => {
    const result = await (setRole as Function)({
      data: { targetUid: 'u1', role: 'admin' },
      ...authedCtx('sa-uid', { email: 'sa@test.com', role: 'super-admin' }),
    });
    expect(result.success).toBe(true);
  });

  it('validates targetUid and role values', async () => {
    await expect((setRole as Function)({ data: { role: 'admin' }, ...adminCtx() })).rejects.toThrow(
      'targetUid is required',
    );
    await expect(
      (setRole as Function)({ data: { targetUid: 'u1', role: 'owner' }, ...adminCtx() }),
    ).rejects.toThrow("role must be 'admin', 'student', or null");
  });

  it('grants admin: claims {role:admin} + admins doc with grantedBy', async () => {
    const result = await (setRole as Function)({ data: { targetUid: 'u1', role: 'admin' }, ...adminCtx() });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', { role: 'admin' });
    expect(refFor('admins/u1').set).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin', grantedBy: 'admin-1', grantedByEmail: 'admin@test.com' }),
      { merge: true },
    );
    expect(result.success).toBe(true);
    expect(result.newRole).toBe('admin');
  });

  it('revokes to student: claims {role:student} + admins doc marked revoked', async () => {
    await (setRole as Function)({ data: { targetUid: 'u1', role: 'student' }, ...adminCtx() });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', { role: 'student' });
    expect(refFor('admins/u1').set).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'student', revokedBy: 'admin-1' }),
      { merge: true },
    );
  });

  it('role null: clears claims and deletes admins doc, newRole falls back to student', async () => {
    const result = await (setRole as Function)({ data: { targetUid: 'u1', role: null }, ...adminCtx() });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', {});
    expect(refFor('admins/u1').delete).toHaveBeenCalled();
    expect(result.newRole).toBe('student');
  });

  it('maps auth/user-not-found to not-found error', async () => {
    mockGetUser.mockRejectedValue(Object.assign(new Error('nope'), { code: 'auth/user-not-found' }));
    await expect(
      (setRole as Function)({ data: { targetUid: 'ghost', role: 'admin' }, ...adminCtx() }),
    ).rejects.toThrow('User with UID ghost not found');
  });
});

// ── toggleUserDisabled ──────────────────────────────────────

describe('toggleUserDisabled', () => {
  const saCtx = (uid = 'sa-uid') => authedCtx(uid, { email: SUPER_ADMIN_EMAIL });

  it('requires authentication', async () => {
    await expect(
      (toggleUserDisabled as Function)({ data: { targetUid: 'u1', disabled: true } }),
    ).rejects.toThrow('Authentication required');
  });

  it('rejects non-super-admin', async () => {
    await expect(
      (toggleUserDisabled as Function)({ data: { targetUid: 'u1', disabled: true }, ...authedCtx() }),
    ).rejects.toThrow('Только super-admin');
  });

  it('validates targetUid and disabled flag', async () => {
    await expect((toggleUserDisabled as Function)({ data: { disabled: true }, ...saCtx() })).rejects.toThrow(
      'targetUid is required',
    );
    await expect(
      (toggleUserDisabled as Function)({ data: { targetUid: 'u1', disabled: 'yes' }, ...saCtx() }),
    ).rejects.toThrow('disabled must be boolean');
  });

  it('cannot disable yourself', async () => {
    await expect(
      (toggleUserDisabled as Function)({ data: { targetUid: 'sa-uid', disabled: true }, ...saCtx('sa-uid') }),
    ).rejects.toThrow('Нельзя отключить самого себя');
  });

  it('disables user: updateUser + users doc with audit fields', async () => {
    const result = await (toggleUserDisabled as Function)(
      { data: { targetUid: 'u1', disabled: true }, ...saCtx() },
    );

    expect(mockUpdateUser).toHaveBeenCalledWith('u1', { disabled: true });
    expect(refFor('users/u1').set).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true, disabledAt: '__SERVER_TS__', disabledBy: 'sa-uid', enabledAt: null }),
      { merge: true },
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain('отключён');
  });

  it('re-enables user: disabled=false with enabledAt audit fields', async () => {
    await (toggleUserDisabled as Function)({ data: { targetUid: 'u1', disabled: false }, ...saCtx() });

    expect(mockUpdateUser).toHaveBeenCalledWith('u1', { disabled: false });
    expect(refFor('users/u1').set).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: false, disabledAt: null, enabledAt: '__SERVER_TS__', enabledBy: 'sa-uid' }),
      { merge: true },
    );
  });

  it('maps auth/user-not-found to not-found error', async () => {
    mockGetUser.mockRejectedValue(Object.assign(new Error('nope'), { code: 'auth/user-not-found' }));
    await expect(
      (toggleUserDisabled as Function)({ data: { targetUid: 'ghost', disabled: true }, ...saCtx() }),
    ).rejects.toThrow('Пользователь не найден');
  });
});
