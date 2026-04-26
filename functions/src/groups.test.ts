import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks ──────────────────────────────────────────────

// Mocks must not reference top-level variables (vi.mock is hoisted).
// We use vi.hoisted() to declare shared mock handles.

const {
  mockAdd, mockUpdate, mockDelete, mockGet, mockGetAll, mockDocRef, mockDoc, mockCollection,
  mockGetUserByEmail,
} = vi.hoisted(() => {
  const mockAdd = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockGet = vi.fn();
  const mockGetAll = vi.fn();
  const mockDocSet = vi.fn();
  const mockDocRef = { get: mockGet, set: mockDocSet, update: mockUpdate, delete: mockDelete };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc, add: mockAdd }));
  const mockGetUserByEmail = vi.fn();
  return { mockAdd, mockUpdate, mockDelete, mockGet, mockGetAll, mockDocRef, mockDoc, mockCollection, mockGetUserByEmail };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection, getAll: mockGetAll }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TS__',
    arrayUnion: (...args: unknown[]) => ({ _type: 'arrayUnion', args }),
    arrayRemove: (...args: unknown[]) => ({ _type: 'arrayRemove', args }),
    delete: () => '__DELETE__',
  },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUserByEmail: mockGetUserByEmail }),
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

import {
  createGroup,
  updateGroup,
  setGroupMembers,
  addGroupMembersByEmail,
  deleteGroup,
  setGroupFeaturedCourses,
} from './groups';

// ── Helpers ─────────────────────────────────────────────────────

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function superAdminCtx(uid = 'sa-uid') {
  return { auth: { uid, token: { email: SUPER_ADMIN_EMAIL } } };
}

function regularCtx(uid = 'regular-uid', email = 'user@example.com') {
  return { auth: { uid, token: { email } } };
}

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── assertSuperAdmin (tested indirectly) ─────────────────────

describe('auth checks (assertSuperAdmin)', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect(createGroup({}, {} as any)).rejects.toThrow('Требуется авторизация');
  });

  it('throws permission-denied for non-super-admin', async () => {
    await expect(createGroup({ name: 'g' }, regularCtx() as any)).rejects.toThrow(
      'Только super-admin',
    );
  });
});

// ── createGroup ──────────────────────────────────────────────

describe('createGroup', () => {
  it('throws when name is missing', async () => {
    await expect(createGroup({}, superAdminCtx() as any)).rejects.toThrow('name is required');
  });

  it('throws when name is empty string', async () => {
    await expect(createGroup({ name: '  ' }, superAdminCtx() as any)).rejects.toThrow(
      'name is required',
    );
  });

  it('creates group with trimmed name', async () => {
    mockAdd.mockResolvedValue({ id: 'new-group-id' });

    const result = await (createGroup as Function)(
      { name: '  My Group  ', memberIds: ['a', '', 'b', 'a'] },
      superAdminCtx(),
    );

    expect(result).toEqual({ success: true, groupId: 'new-group-id' });
    expect(mockAdd).toHaveBeenCalledOnce();
    const payload = mockAdd.mock.calls[0][0];
    expect(payload.name).toBe('My Group');
    // normalizeStringArray deduplicates and filters empty
    expect(payload.memberIds).toEqual(['a', 'b']);
  });

  it('normalizeStringArray handles non-array input', async () => {
    mockAdd.mockResolvedValue({ id: 'g1' });
    await (createGroup as Function)({ name: 'G', memberIds: 'not-array' }, superAdminCtx());
    const payload = mockAdd.mock.calls[0][0];
    expect(payload.memberIds).toEqual([]);
  });

  it('includes description only when non-empty', async () => {
    mockAdd.mockResolvedValue({ id: 'g1' });
    await (createGroup as Function)({ name: 'G', description: '  ' }, superAdminCtx());
    const payload = mockAdd.mock.calls[0][0];
    expect(payload.description).toBeUndefined();

    mockAdd.mockResolvedValue({ id: 'g2' });
    await (createGroup as Function)({ name: 'G', description: ' Desc ' }, superAdminCtx());
    const payload2 = mockAdd.mock.calls[1][0];
    expect(payload2.description).toBe('Desc');
  });
});

// ── updateGroup ──────────────────────────────────────────────

describe('updateGroup', () => {
  it('throws when groupId missing', async () => {
    await expect((updateGroup as Function)({}, superAdminCtx())).rejects.toThrow(
      'groupId is required',
    );
  });

  it('throws when name set to empty string', async () => {
    await expect(
      (updateGroup as Function)({ groupId: 'g1', name: '  ' }, superAdminCtx()),
    ).rejects.toThrow('name cannot be empty');
  });

  it('updates only provided fields', async () => {
    mockUpdate.mockResolvedValue(undefined);
    await (updateGroup as Function)({ groupId: 'g1', name: 'New' }, superAdminCtx());
    expect(mockCollection).toHaveBeenCalledWith('groups');
    expect(mockDoc).toHaveBeenCalledWith('g1');
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.name).toBe('New');
    expect(updates.grantedCourses).toBeUndefined();
  });

  it('sets description to FieldValue.delete() when empty', async () => {
    mockUpdate.mockResolvedValue(undefined);
    await (updateGroup as Function)({ groupId: 'g1', description: '' }, superAdminCtx());
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.description).toBe('__DELETE__');
  });
});

// ── setGroupMembers ──────────────────────────────────────────

describe('setGroupMembers', () => {
  it('updates memberIds with normalized array', async () => {
    mockUpdate.mockResolvedValue(undefined);
    const result = await (setGroupMembers as Function)(
      { groupId: 'g1', memberIds: ['a', 'b', 'a', ''] },
      superAdminCtx(),
    );
    expect(result).toEqual({ success: true, count: 2 });
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.memberIds).toEqual(['a', 'b']);
  });
});

// ── addGroupMembersByEmail ──────────────────────────────────

describe('addGroupMembersByEmail', () => {
  it('throws when emails list is empty', async () => {
    await expect(
      (addGroupMembersByEmail as Function)({ groupId: 'g1', emails: [] }, superAdminCtx()),
    ).rejects.toThrow('emails must be a non-empty list');
  });

  it('throws when emails is not an array', async () => {
    await expect(
      (addGroupMembersByEmail as Function)({ groupId: 'g1', emails: 'bad' }, superAdminCtx()),
    ).rejects.toThrow('emails must be a non-empty list');
  });

  it('resolves existing user by Auth and adds uid', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'real-uid-1' });
    mockGet.mockResolvedValue({ data: () => ({ grantedCourses: ['dev'] }) });
    mockUpdate.mockResolvedValue(undefined);

    const result = await (addGroupMembersByEmail as Function)(
      { groupId: 'g1', emails: ['test@example.com'] },
      superAdminCtx(),
    );

    expect(result.resolvedExisting).toBe(1);
    expect(result.createdPending).toBe(0);
    expect(result.uids).toContain('real-uid-1');
  });

  it('creates pending doc for unknown email and builds courseAccess from grantedCourses', async () => {
    // Auth throws user-not-found
    mockGetUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    // Group has grantedCourses
    mockGet.mockResolvedValueOnce({ data: () => ({ grantedCourses: ['development', 'clinical'] }) });
    // Pending doc does not exist
    mockGet.mockResolvedValueOnce({ exists: false });
    mockDocRef.set.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);

    const result = await (addGroupMembersByEmail as Function)(
      { groupId: 'g1', emails: ['new@example.com'] },
      superAdminCtx(),
    );

    expect(result.createdPending).toBe(1);
    // Verify pending doc was set with courseAccess derived from group's grantedCourses
    const setCall = mockDocRef.set.mock.calls[0][0];
    expect(setCall.courseAccess).toEqual({ development: true, clinical: true });
    expect(setCall.pendingRegistration).toBe(true);
  });

  it('deduplicates and normalizes emails', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'uid-1' });
    mockGet.mockResolvedValue({ data: () => ({ grantedCourses: [] }) });
    mockUpdate.mockResolvedValue(undefined);

    const result = await (addGroupMembersByEmail as Function)(
      { groupId: 'g1', emails: ['Test@Example.COM', '  test@example.com  '] },
      superAdminCtx(),
    );

    // Should resolve only once due to deduplication
    expect(mockGetUserByEmail).toHaveBeenCalledTimes(1);
    expect(result.resolvedExisting).toBe(1);
  });

  it('propagates non-user-not-found auth errors', async () => {
    mockGetUserByEmail.mockRejectedValue({ code: 'auth/internal-error', message: 'boom' });
    mockGet.mockResolvedValue({ data: () => ({ grantedCourses: [] }) });

    await expect(
      (addGroupMembersByEmail as Function)(
        { groupId: 'g1', emails: ['fail@example.com'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('Failed to resolve');
  });
});

// ── deleteGroup ─────────────────────────────────────────────

describe('deleteGroup', () => {
  it('deletes group by id', async () => {
    mockDelete.mockResolvedValue(undefined);
    const result = await (deleteGroup as Function)({ groupId: 'g1' }, superAdminCtx());
    expect(result).toEqual({ success: true });
    expect(mockDoc).toHaveBeenCalledWith('g1');
    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it('throws when groupId missing', async () => {
    await expect((deleteGroup as Function)({}, superAdminCtx())).rejects.toThrow(
      'groupId is required',
    );
  });
});

// ── system group guards ─────────────────────────────────────

describe('system group (everyone) guards', () => {
  it('deleteGroup refuses to delete everyone', async () => {
    await expect(
      (deleteGroup as Function)({ groupId: 'everyone' }, superAdminCtx()),
    ).rejects.toThrow('нельзя удалить');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('updateGroup refuses to rename everyone', async () => {
    await expect(
      (updateGroup as Function)({ groupId: 'everyone', name: 'Rename' }, superAdminCtx()),
    ).rejects.toThrow('нельзя переименовывать');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updateGroup allows changing description / grantedCourses for everyone', async () => {
    mockUpdate.mockResolvedValue(undefined);
    await (updateGroup as Function)(
      { groupId: 'everyone', description: 'Broadcast', grantedCourses: ['development'] },
      superAdminCtx(),
    );
    expect(mockUpdate).toHaveBeenCalledOnce();
    const payload = mockUpdate.mock.calls[0][0];
    expect(payload.description).toBe('Broadcast');
    expect(payload.grantedCourses).toEqual(['development']);
    expect(payload.name).toBeUndefined();
  });

  it('setGroupMembers refuses to overwrite everyone membership', async () => {
    await expect(
      (setGroupMembers as Function)({ groupId: 'everyone', memberIds: ['a'] }, superAdminCtx()),
    ).rejects.toThrow('автоматически');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ── setGroupFeaturedCourses ─────────────────────────────────

describe('setGroupFeaturedCourses', () => {
  it('throws when groupId missing', async () => {
    await expect(
      (setGroupFeaturedCourses as Function)({ courseIds: [] }, superAdminCtx()),
    ).rejects.toThrow('groupId is required');
  });

  it('throws when courseIds is not an array', async () => {
    await expect(
      (setGroupFeaturedCourses as Function)(
        { groupId: 'g1', courseIds: 'oops' },
        superAdminCtx(),
      ),
    ).rejects.toThrow('courseIds must be an array');
  });

  it('throws when more than 3 ids', async () => {
    await expect(
      (setGroupFeaturedCourses as Function)(
        { groupId: 'g1', courseIds: ['a', 'b', 'c', 'd'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('не более 3');
  });

  it('throws when caller is not super-admin and not announcement-admin', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ announcementAdminIds: ['someone-else'] }),
    });
    await expect(
      (setGroupFeaturedCourses as Function)(
        { groupId: 'g1', courseIds: [] },
        regularCtx('regular-uid', 'r@example.com'),
      ),
    ).rejects.toThrow('Только super-admin или админ этой группы');
  });

  it('throws when one of courses does not exist', async () => {
    mockGetAll.mockResolvedValue([
      { exists: true },
      { exists: false },
    ]);
    await expect(
      (setGroupFeaturedCourses as Function)(
        { groupId: 'g1', courseIds: ['present', 'missing'] },
        superAdminCtx(),
      ),
    ).rejects.toThrow('Курсы не найдены: missing');
  });

  it('writes featured courses for super-admin', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }, { exists: true }]);
    mockUpdate.mockResolvedValue(undefined);
    const result = await (setGroupFeaturedCourses as Function)(
      { groupId: 'g1', courseIds: ['A', 'B', 'A'] }, // dedup → [A,B]
      superAdminCtx(),
    );
    expect(result).toEqual({ success: true, courseIds: ['A', 'B'] });
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.featuredCourseIds).toEqual(['A', 'B']);
  });

  it('uses FieldValue.delete() for empty list', async () => {
    mockUpdate.mockResolvedValue(undefined);
    await (setGroupFeaturedCourses as Function)(
      { groupId: 'g1', courseIds: [] },
      superAdminCtx(),
    );
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.featuredCourseIds).toBe('__DELETE__');
  });

  it('allows announcement-admin caller', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ announcementAdminIds: ['regular-uid'] }),
    });
    mockGetAll.mockResolvedValue([{ exists: true }]);
    mockUpdate.mockResolvedValue(undefined);
    const ctx = {
      auth: { uid: 'regular-uid', token: { email: 'r@example.com', role: 'admin' } },
    };
    const result = await (setGroupFeaturedCourses as Function)(
      { groupId: 'g1', courseIds: ['X'] },
      ctx,
    );
    expect(result.courseIds).toEqual(['X']);
  });
});
