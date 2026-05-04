import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ──────────────────────────────────────────────

const {
  mockUpdate, mockGet, mockCollection, mockSetCustomUserClaims, mockGetUserByEmail,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockGet = vi.fn();
  const mockDocRef = { get: mockGet, update: mockUpdate };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  const mockSetCustomUserClaims = vi.fn();
  const mockGetUserByEmail = vi.fn();
  return { mockUpdate, mockGet, mockCollection, mockSetCustomUserClaims, mockGetUserByEmail };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TS__',
    delete: () => '__DELETE__',
  },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    setCustomUserClaims: mockSetCustomUserClaims,
    getUserByEmail: mockGetUserByEmail,
  }),
}));

vi.mock('firebase-admin/app', () => ({
  getApps: () => [],
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  return {
    default: {
      https: { onCall: (fn: Function) => fn, HttpsError },
      logger: { info: vi.fn(), error: vi.fn() },
    },
    https: { onCall: (fn: Function) => fn, HttpsError },
    logger: { info: vi.fn(), error: vi.fn() },
  };
});

// ── Import after mocks ─────────────────────────────────────────

import { makeUserCoAdmin, removeCoAdmin } from './coAdmin';

// ── Helpers ─────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function superAdminCtx(uid = 'sa-uid') {
  return { auth: { uid, token: { email: SUPER_ADMIN_EMAIL } } };
}

function regularCtx(uid = 'regular-uid') {
  return { auth: { uid, token: { email: 'user@example.com' } } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Auth checks ─────────────────────────────────────────────

describe('coAdmin auth checks', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((makeUserCoAdmin as Function)({}, {} as any)).rejects.toThrow('Требуется авторизация');
  });

  it('throws permission-denied for non-super-admin', async () => {
    await expect(
      (makeUserCoAdmin as Function)({ targetUid: 'u1' }, regularCtx()),
    ).rejects.toThrow('Только super-admin');
  });
});

// ── makeUserCoAdmin ─────────────────────────────────────────

describe('makeUserCoAdmin', () => {
  it('resolves user by email when targetUid not provided', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'resolved-uid' });
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (makeUserCoAdmin as Function)(
      { targetEmail: 'target@test.com' },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);
    expect(result.uid).toBe('resolved-uid');
    expect(mockGetUserByEmail).toHaveBeenCalledWith('target@test.com');
  });

  it('throws not-found when email lookup fails', async () => {
    mockGetUserByEmail.mockRejectedValue(new Error('not found'));

    await expect(
      (makeUserCoAdmin as Function)({ targetEmail: 'missing@test.com' }, superAdminCtx()),
    ).rejects.toThrow('не найден');
  });

  it('throws when neither targetUid nor targetEmail provided', async () => {
    await expect(
      (makeUserCoAdmin as Function)({}, superAdminCtx()),
    ).rejects.toThrow('Не указан UID или email');
  });

  it('throws when user doc does not exist', async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(
      (makeUserCoAdmin as Function)({ targetUid: 'u1' }, superAdminCtx()),
    ).rejects.toThrow('хотя бы раз войти');
  });

  it('refuses to overwrite existing admin', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'admin' }) });
    await expect(
      (makeUserCoAdmin as Function)({ targetUid: 'u1' }, superAdminCtx()),
    ).rejects.toThrow('уже admin/super-admin');
  });

  it('refuses to overwrite super-admin', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'super-admin' }) });
    await expect(
      (makeUserCoAdmin as Function)({ targetUid: 'u1' }, superAdminCtx()),
    ).rejects.toThrow('уже admin/super-admin');
  });

  it('promotes user to co-admin', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (makeUserCoAdmin as Function)(
      { targetUid: 'u1' },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.role).toBe('co-admin');

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', { role: 'co-admin' });
  });
});

// ── removeCoAdmin ───────────────────────────────────────────

describe('removeCoAdmin', () => {
  it('throws when targetUid missing', async () => {
    await expect((removeCoAdmin as Function)({}, superAdminCtx())).rejects.toThrow('Не указан UID');
  });

  it('throws when removing self', async () => {
    await expect(
      (removeCoAdmin as Function)({ targetUid: 'sa-uid' }, superAdminCtx('sa-uid')),
    ).rejects.toThrow('у самого себя');
  });

  it('throws when user not found', async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(
      (removeCoAdmin as Function)({ targetUid: 'u1' }, superAdminCtx()),
    ).rejects.toThrow('не найден');
  });

  it('refuses to demote a regular admin (use removeAdmin)', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'admin' }) });
    await expect(
      (removeCoAdmin as Function)({ targetUid: 'admin-1' }, superAdminCtx()),
    ).rejects.toThrow('Снять можно только со-админа');
  });

  it('removes co-admin role and clears claims', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'co-admin' }) });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (removeCoAdmin as Function)({ targetUid: 'co-1' }, superAdminCtx());

    expect(result.success).toBe(true);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.role).toBe('__DELETE__');

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('co-1', {});
  });
});
