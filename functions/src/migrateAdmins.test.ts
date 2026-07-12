import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const {
  docMap, docOps, mockCollection, mockListUsers, mockSetCustomUserClaims,
} = vi.hoisted(() => {
  const docMap = new Map<string, { exists: boolean; data?: Record<string, unknown> }>();
  const docOps: Array<{ op: 'set' | 'update'; path: string; payload: Record<string, unknown> }> = [];
  const adminsDocs: { id: string }[] = [];
  const mockCollection = vi.fn((name: string) => {
    if (name === 'admins') {
      return { get: async () => ({ docs: adminsDocs }) };
    }
    if (name === 'users') {
      return {
        doc: (uid: string) => {
          const path = `users/${uid}`;
          return {
            get: async () => docMap.get(path) ?? { exists: false },
            set: vi.fn(async (payload: Record<string, unknown>) => {
              docOps.push({ op: 'set', path, payload });
            }),
            update: vi.fn(async (payload: Record<string, unknown>) => {
              docOps.push({ op: 'update', path, payload });
            }),
          };
        },
      };
    }
    throw new Error(`unexpected collection ${name}`);
  });
  // adminsDocs наполняется через docMap с префиксом admins/
  const refreshAdmins = () => {
    adminsDocs.length = 0;
    for (const key of docMap.keys()) {
      if (key.startsWith('admins/')) adminsDocs.push({ id: key.slice('admins/'.length) });
    }
  };
  return {
    docMap: Object.assign(docMap, { refreshAdmins }),
    docOps,
    mockCollection,
    mockListUsers: vi.fn(),
    mockSetCustomUserClaims: vi.fn(),
  };
});

vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ listUsers: mockListUsers, setCustomUserClaims: mockSetCustomUserClaims }),
}));

vi.mock('firebase-functions', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    default: { https: { onRequest: (fn: Function) => fn }, logger },
    https: { onRequest: (fn: Function) => fn },
    logger,
  };
});

// ── Import after mocks ─────────────────────────────────────────

import { migrateAdmins } from './migrateAdmins';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function makeRes() {
  const res: { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } = {
    json: vi.fn(),
    status: vi.fn(() => res),
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  docMap.clear();
  docOps.length = 0;
  docMap.refreshAdmins();
});

// ── Tests ───────────────────────────────────────────────────

describe('migrateAdmins', () => {
  it('assigns roles: super-admin by email, admin from admins collection, student otherwise', async () => {
    docMap.set('admins/admin-uid', { exists: true });
    docMap.set('users/admin-uid', { exists: true, data: {} });
    docMap.refreshAdmins();
    mockListUsers.mockResolvedValue({
      users: [
        { uid: 'sa-uid', email: SUPER_ADMIN_EMAIL, displayName: 'SA', photoURL: null },
        { uid: 'admin-uid', email: 'admin@test.com', displayName: 'Admin', photoURL: null },
        { uid: 'student-uid', email: 'st@test.com', displayName: 'St', photoURL: null },
      ],
      pageToken: undefined,
    });

    const res = makeRes();
    await (migrateAdmins as Function)({}, res);

    // существующий doc → update, новых два → set
    expect(docOps).toEqual([
      { op: 'set', path: 'users/sa-uid', payload: expect.objectContaining({ role: 'super-admin' }) },
      { op: 'update', path: 'users/admin-uid', payload: expect.objectContaining({ role: 'admin' }) },
      { op: 'set', path: 'users/student-uid', payload: expect.objectContaining({ role: 'student' }) },
    ]);
    expect(mockSetCustomUserClaims.mock.calls).toEqual([
      ['sa-uid', { role: 'super-admin' }],
      ['admin-uid', { role: 'admin' }],
      ['student-uid', { role: 'student' }],
    ]);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Migration completed',
      stats: { totalUsers: 3, oldAdmins: 1, migrated: 1, created: 2, skipped: 0 },
    });
  });

  it('paginates through listUsers pages', async () => {
    mockListUsers
      .mockResolvedValueOnce({ users: [{ uid: 'u1', email: 'a@t.co' }], pageToken: 'next' })
      .mockResolvedValueOnce({ users: [{ uid: 'u2', email: 'b@t.co' }], pageToken: undefined });

    const res = makeRes();
    await (migrateAdmins as Function)({}, res);

    expect(mockListUsers).toHaveBeenCalledTimes(2);
    expect(mockListUsers).toHaveBeenNthCalledWith(1, 1000, undefined);
    expect(mockListUsers).toHaveBeenNthCalledWith(2, 1000, 'next');
    expect(res.json.mock.calls[0][0].stats.totalUsers).toBe(2);
  });

  it('responds 500 with error payload on failure', async () => {
    mockListUsers.mockRejectedValue(new Error('auth quota'));

    const res = makeRes();
    await (migrateAdmins as Function)({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: expect.stringContaining('auth quota') });
  });
});
