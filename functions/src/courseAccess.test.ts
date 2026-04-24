import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ──────────────────────────────────────────────

const {
  mockUpdate, mockGet, mockCollection, mockSetCustomUserClaims,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockGet = vi.fn();
  const mockDocRef = { get: mockGet, update: mockUpdate };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  const mockSetCustomUserClaims = vi.fn();
  return { mockUpdate, mockGet, mockCollection, mockSetCustomUserClaims };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TS__',
  },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ setCustomUserClaims: mockSetCustomUserClaims }),
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

import { updateCourseAccess, setUserRole } from './courseAccess';

// ── Helpers ─────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function superAdminCtx(uid = 'sa-uid') {
  return { auth: { uid, token: { email: SUPER_ADMIN_EMAIL, role: 'super-admin' } } };
}

function adminCtx(uid = 'admin-uid') {
  return { auth: { uid, token: { email: 'admin@test.com', role: 'admin' } } };
}

function regularCtx(uid = 'regular-uid') {
  return { auth: { uid, token: { email: 'user@example.com', role: 'guest' } } };
}

const noAuthCtx = {};

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── updateCourseAccess ──────────────────────────────────────

describe('updateCourseAccess', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((updateCourseAccess as Function)({}, noAuthCtx)).rejects.toThrow(
      'Authentication required',
    );
  });

  it('throws permission-denied for non-super-admin', async () => {
    await expect(
      (updateCourseAccess as Function)({ targetUid: 'u1', courseAccess: {} }, regularCtx()),
    ).rejects.toThrow('Only super-admin');
  });

  it('throws when targetUid missing', async () => {
    await expect(
      (updateCourseAccess as Function)({ courseAccess: { dev: true } }, superAdminCtx()),
    ).rejects.toThrow('targetUid is required');
  });

  it('throws when courseAccess missing', async () => {
    await expect(
      (updateCourseAccess as Function)({ targetUid: 'u1' }, superAdminCtx()),
    ).rejects.toThrow('courseAccess is required');
  });

  it('throws when courseAccess contains non-boolean value', async () => {
    await expect(
      (updateCourseAccess as Function)(
        { targetUid: 'u1', courseAccess: { dev: 'yes' } },
        superAdminCtx(),
      ),
    ).rejects.toThrow('Course access value must be boolean');
  });

  it('throws not-found when user does not exist', async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(
      (updateCourseAccess as Function)(
        { targetUid: 'u1', courseAccess: { dev: true } },
        superAdminCtx(),
      ),
    ).rejects.toThrow('not found');
  });

  it('updates courseAccess for existing user', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'guest', email: 'u@t.com' }) });
    mockUpdate.mockResolvedValue(undefined);

    const result = await (updateCourseAccess as Function)(
      { targetUid: 'u1', courseAccess: { development: true, clinical: false } },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);
    expect(result.courseAccess).toEqual({ development: true, clinical: false });
    expect(mockUpdate).toHaveBeenCalledOnce();
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.courseAccess).toEqual({ development: true, clinical: false });
  });
});

// ── setUserRole ─────────────────────────────────────────────

describe('setUserRole', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((setUserRole as Function)({}, noAuthCtx)).rejects.toThrow(
      'Authentication required',
    );
  });

  it('throws permission-denied for non-super-admin', async () => {
    await expect(
      (setUserRole as Function)({ targetUid: 'u1', role: 'student' }, regularCtx()),
    ).rejects.toThrow('Only super-admin');
  });

  it('throws for invalid role', async () => {
    await expect(
      (setUserRole as Function)({ targetUid: 'u1', role: 'admin' }, superAdminCtx()),
    ).rejects.toThrow('role must be one of');
  });

  it('throws when trying to change admin role', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'admin' }) });
    await expect(
      (setUserRole as Function)({ targetUid: 'u1', role: 'guest' }, superAdminCtx()),
    ).rejects.toThrow('Cannot change admin roles');
  });

  it('throws when trying to change super-admin role', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'super-admin' }) });
    await expect(
      (setUserRole as Function)({ targetUid: 'u1', role: 'guest' }, superAdminCtx()),
    ).rejects.toThrow('Cannot change admin roles');
  });

  it('changes guest to student', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ role: 'guest', email: 'u@t.com' }) });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    const result = await (setUserRole as Function)(
      { targetUid: 'u1', role: 'student' },
      superAdminCtx(),
    );

    expect(result.success).toBe(true);
    expect(result.newRole).toBe('student');
    expect(result.previousRole).toBe('guest');
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', { role: 'student' });
  });

  it('initializes courseAccess when changing to guest without existing courseAccess', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'student', email: 'u@t.com' }),
    });
    mockUpdate.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    await (setUserRole as Function)({ targetUid: 'u1', role: 'guest' }, superAdminCtx());

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.courseAccess).toEqual({
      development: false,
      clinical: false,
      general: false,
    });
  });
});

