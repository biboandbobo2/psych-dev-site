import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ──────────────────────────────────────────────

const {
  mockUpdate, mockGet, mockCollection, mockSetCustomUserClaims, mockGetUserByEmail, mockGetUser,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockGet = vi.fn();
  const mockDocRef = { get: mockGet, update: mockUpdate };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  const mockSetCustomUserClaims = vi.fn();
  const mockGetUserByEmail = vi.fn();
  const mockGetUser = vi.fn();
  return { mockUpdate, mockGet, mockCollection, mockSetCustomUserClaims, mockGetUserByEmail, mockGetUser };
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
    getUser: mockGetUser,
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

import { makeUserAdmin, removeAdmin, setAdminEditableCourses } from './makeAdmin';

// ── Helpers ─────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function superAdminCtx(uid = 'sa-uid') {
  return { auth: { uid, token: { email: SUPER_ADMIN_EMAIL } } };
}

function regularCtx(uid = 'regular-uid') {
  return { auth: { uid, token: { email: 'user@example.com' } } };
}

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // По умолчанию у целевого юзера нет существующих claims.
  // Тесты, где это важно (merge с coAdmin), переопределяют локально.
  mockGetUser.mockResolvedValue({ customClaims: {} });
});

// ── Auth checks ─────────────────────────────────────────────

describe('auth checks (assertSuperAdmin)', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((makeUserAdmin as Function)({}, {} as any)).rejects.toThrow('Требуется авторизация');
  });

  it('throws permission-denied for non-super-admin', async () => {
    await expect(
      (makeUserAdmin as Function)(
        { targetUid: 'u1', editableCourses: ['dev'] },
        regularCtx(),
      ),
    ).rejects.toThrow('Только super-admin');
  });
});

// ── makeUserAdmin ───────────────────────────────────────────

describe('makeUserAdmin', () => {
  it('throws when editableCourses is empty', async () => {
    await expect(
      (makeUserAdmin as Function)({ targetUid: 'u1', editableCourses: [] }, superAdminCtx()),
    ).rejects.toThrow('хотя бы один курс');
  });

  it('throws when editableCourses contains only empty strings', async () => {
    await expect(
      (makeUserAdmin as Function)({ targetUid: 'u1', editableCourses: ['', '  '] }, superAdminCtx()),
    ).rejects.toThrow('хотя бы один курс');
  });

  it('resolves user by email when targetUid not provided', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'resolved-uid' });
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'guest' }) });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (makeUserAdmin as Function)(
      { targetEmail: 'target@test.com', editableCourses: ['development'] },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);
    expect(result.uid).toBe('resolved-uid');
    expect(mockGetUserByEmail).toHaveBeenCalledWith('target@test.com');
  });

  it('throws not-found when email lookup fails', async () => {
    mockGetUserByEmail.mockRejectedValue(new Error('not found'));

    await expect(
      (makeUserAdmin as Function)(
        { targetEmail: 'missing@test.com', editableCourses: ['dev'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('не найден');
  });

  it('throws when neither targetUid nor targetEmail provided', async () => {
    await expect(
      (makeUserAdmin as Function)({ editableCourses: ['dev'] }, superAdminCtx()),
    ).rejects.toThrow('Не указан UID или email');
  });

  it('throws when user doc does not exist', async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(
      (makeUserAdmin as Function)(
        { targetUid: 'u1', editableCourses: ['dev'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('хотя бы раз войти');
  });

  it('promotes user to admin with editableCourses', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'guest' }) });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (makeUserAdmin as Function)(
      { targetUid: 'u1', editableCourses: ['development', 'clinical'] },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);
    expect(result.editableCourses).toEqual(['development', 'clinical']);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.role).toBe('admin');
    expect(updatePayload.adminEditableCourses).toEqual(['development', 'clinical']);

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', {
      role: 'admin',
      editableCourses: ['development', 'clinical'],
    });
  });

  it('preserves coAdmin claim when promoting existing co-admin to admin', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ coAdmin: true }) });
    mockUpdate.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({ customClaims: { coAdmin: true } });
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    await (makeUserAdmin as Function)(
      { targetUid: 'u1', editableCourses: ['development'] },
      superAdminCtx(),
    );

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', {
      coAdmin: true,
      role: 'admin',
      editableCourses: ['development'],
    });
  });
});

// ── removeAdmin ─────────────────────────────────────────────

describe('removeAdmin', () => {
  it('throws when targetUid missing', async () => {
    await expect((removeAdmin as Function)({}, superAdminCtx())).rejects.toThrow('Не указан UID');
  });

  it('throws when removing self', async () => {
    await expect(
      (removeAdmin as Function)({ targetUid: 'sa-uid' }, superAdminCtx('sa-uid')),
    ).rejects.toThrow('у самого себя');
  });

  it('removes admin role and clears admin claims', async () => {
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (removeAdmin as Function)({ targetUid: 'admin-1' }, superAdminCtx());

    expect(result.success).toBe(true);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.role).toBe('__DELETE__');
    expect(updatePayload.adminEditableCourses).toBe('__DELETE__');

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('admin-1', {});
  });

  it('preserves coAdmin claim when removing admin role', async () => {
    mockUpdate.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({
      customClaims: { role: 'admin', editableCourses: ['development'], coAdmin: true },
    });
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    await (removeAdmin as Function)({ targetUid: 'admin-1' }, superAdminCtx());

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('admin-1', { coAdmin: true });
  });
});

// ── setAdminEditableCourses ─────────────────────────────────

describe('setAdminEditableCourses', () => {
  it('throws when targetUid missing', async () => {
    await expect(
      (setAdminEditableCourses as Function)({ editableCourses: ['dev'] }, superAdminCtx()),
    ).rejects.toThrow('Не указан UID');
  });

  it('throws when editableCourses empty', async () => {
    await expect(
      (setAdminEditableCourses as Function)(
        { targetUid: 'u1', editableCourses: [] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('хотя бы один курс');
  });

  it('throws when user not found', async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(
      (setAdminEditableCourses as Function)(
        { targetUid: 'u1', editableCourses: ['dev'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('не найден');
  });

  it('throws when user is not admin', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'student' }) });
    await expect(
      (setAdminEditableCourses as Function)(
        { targetUid: 'u1', editableCourses: ['dev'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('ролью admin');
  });

  it('updates editable courses for existing admin', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'admin' }) });
    mockUpdate.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({ customClaims: { role: 'admin', editableCourses: ['development'] } });
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (setAdminEditableCourses as Function)(
      { targetUid: 'u1', editableCourses: ['development', 'clinical'] },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);
    expect(result.editableCourses).toEqual(['development', 'clinical']);
    expect(mockUpdate).toHaveBeenCalledWith({ adminEditableCourses: ['development', 'clinical'] });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', {
      role: 'admin',
      editableCourses: ['development', 'clinical'],
    });
  });

  it('preserves coAdmin when updating editable courses', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'admin' }) });
    mockUpdate.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({
      customClaims: { role: 'admin', editableCourses: ['development'], coAdmin: true },
    });
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    await (setAdminEditableCourses as Function)(
      { targetUid: 'u1', editableCourses: ['clinical'] },
      superAdminCtx(),
    );

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', {
      coAdmin: true,
      role: 'admin',
      editableCourses: ['clinical'],
    });
  });
});
