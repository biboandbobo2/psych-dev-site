import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ──────────────────────────────────────────────

const {
  mockSet, mockUpdate, mockDeleteDoc, mockGet, mockDoc, mockWhere, mockCollection,
  mockSetCustomUserClaims,
} = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn();
  const mockDocRef = { get: mockGet, set: mockSet, update: mockUpdate, delete: mockDeleteDoc };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockWhere = vi.fn(() => ({
    get: vi.fn(async () => ({ docs: [], size: 0 })),
  }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc, where: mockWhere }));
  const mockSetCustomUserClaims = vi.fn();
  return { mockSet, mockUpdate, mockDeleteDoc, mockGet, mockDoc, mockWhere, mockCollection, mockSetCustomUserClaims };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TS__',
    arrayRemove: (...args: unknown[]) => ({ _type: 'arrayRemove', args }),
    arrayUnion: (...args: unknown[]) => ({ _type: 'arrayUnion', args }),
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
      auth: { user: () => ({ onCreate: (fn: Function) => fn }) },
    },
    https: { onCall: (fn: Function) => fn, HttpsError },
    logger: { info: vi.fn(), error: vi.fn() },
    auth: { user: () => ({ onCreate: (fn: Function) => fn }) },
  };
});

vi.mock('./lib/debug.js', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

// ── Import after mocks ─────────────────────────────────────────

import { onUserCreate } from './onUserCreate';

// ── Helpers ─────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function makeUser(overrides: Partial<{ uid: string; email: string; displayName: string; photoURL: string }> = {}) {
  return {
    uid: overrides.uid ?? 'user-123',
    email: overrides.email ?? 'newuser@example.com',
    displayName: overrides.displayName ?? 'New User',
    photoURL: overrides.photoURL ?? null,
  };
}

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mockWhere to return empty results by default
  mockWhere.mockImplementation(() => ({
    get: vi.fn(async () => ({ docs: [], size: 0 })),
  }));
});

describe('onUserCreate', () => {
  it('creates user doc with guest role for regular email', async () => {
    // No pending doc
    mockGet.mockResolvedValue({ exists: false });

    await (onUserCreate as Function)(makeUser());

    expect(mockSet).toHaveBeenCalledOnce();
    const userData = mockSet.mock.calls[0][0];
    expect(userData.role).toBe('guest');
    expect(userData.uid).toBe('user-123');
    expect(userData.courseAccess).toEqual({
      development: false,
      clinical: false,
      general: false,
    });

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user-123', { role: 'guest' });
  });

  it('assigns super-admin role for super-admin email', async () => {
    mockGet.mockResolvedValue({ exists: false });

    await (onUserCreate as Function)(makeUser({ email: SUPER_ADMIN_EMAIL }));

    const userData = mockSet.mock.calls[0][0];
    expect(userData.role).toBe('super-admin');
    // super-admin should NOT have courseAccess field
    expect(userData.courseAccess).toBeUndefined();

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user-123', { role: 'super-admin' });
  });

  it('inherits student role and courseAccess from pending doc', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        role: 'student',
        courseAccess: { development: true, clinical: false },
      }),
    });

    await (onUserCreate as Function)(makeUser());

    const userData = mockSet.mock.calls[0][0];
    expect(userData.role).toBe('student');
    expect(userData.courseAccess).toEqual({ development: true, clinical: false });

    // Pending doc should be deleted
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('stays guest when pending doc exists but role is not student', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: 'guest', courseAccess: {} }),
    });

    await (onUserCreate as Function)(makeUser());

    const userData = mockSet.mock.calls[0][0];
    expect(userData.role).toBe('guest');
  });

  it('replaces pendingUid with real uid in group memberIds', async () => {
    mockGet.mockResolvedValue({ exists: false });

    const groupUpdateFn = vi.fn().mockResolvedValue(undefined);

    // First where() = memberIds query (1 group found), second = announcementAdminIds (none)
    let whereCallCount = 0;
    mockWhere.mockImplementation(() => {
      whereCallCount++;
      return {
        get: vi.fn(async () => ({
          docs: whereCallCount === 1 ? [{ ref: { update: groupUpdateFn } }] : [],
          size: whereCallCount === 1 ? 1 : 0,
        })),
      };
    });

    await (onUserCreate as Function)(makeUser());

    // groupUpdateFn should have been called for arrayRemove + arrayUnion
    expect(groupUpdateFn).toHaveBeenCalledTimes(2);
  });

  it('handles user without email', async () => {
    await (onUserCreate as Function)({
      uid: 'no-email-uid',
      email: undefined,
      displayName: null,
      photoURL: null,
    });

    const userData = mockSet.mock.calls[0][0];
    expect(userData.role).toBe('guest');
    expect(userData.email).toBeNull();
  });
});
