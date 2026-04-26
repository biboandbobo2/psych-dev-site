import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockSet, mockGetAll, mockDocRef, mockDoc, mockCollection,
} = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockGetAll = vi.fn();
  const mockDocRef = { set: mockSet };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  return { mockSet, mockGetAll, mockDocRef, mockDoc, mockCollection };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection, getAll: mockGetAll }),
  FieldValue: {
    serverTimestamp: () => '__SERVER_TS__',
    delete: () => '__DELETE__',
  },
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

import { setMyFeaturedCourses } from './users';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setMyFeaturedCourses', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((setMyFeaturedCourses as Function)({ courseIds: [] }, {})).rejects.toThrow(
      'Требуется авторизация',
    );
  });

  it('writes own featured courses for self', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }, { exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    const result = await (setMyFeaturedCourses as Function)(
      { courseIds: ['A', 'B'] },
      ctx,
    );
    expect(result).toEqual({ success: true, courseIds: ['A', 'B'] });
    expect(mockDoc).toHaveBeenCalledWith('u1');
    const setCall = mockSet.mock.calls[0][0];
    expect(setCall.featuredCourseIds).toEqual(['A', 'B']);
  });

  it('rejects writing for someone else when caller is regular user', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)(
        { targetUid: 'other-uid', courseIds: ['A'] },
        ctx,
      ),
    ).rejects.toThrow('Только сам пользователь или super-admin');
  });

  it('allows super-admin to write for another user', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'sa', token: { email: SUPER_ADMIN_EMAIL } } };
    const result = await (setMyFeaturedCourses as Function)(
      { targetUid: 'other-uid', courseIds: ['A'] },
      ctx,
    );
    expect(result.courseIds).toEqual(['A']);
    expect(mockDoc).toHaveBeenCalledWith('other-uid');
  });

  it('throws when more than 3 courseIds', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)(
        { courseIds: ['A', 'B', 'C', 'D'] },
        ctx,
      ),
    ).rejects.toThrow('не более 3');
  });

  it('throws when courseIds not an array', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)({ courseIds: 'oops' }, ctx),
    ).rejects.toThrow('courseIds must be an array');
  });

  it('throws when course does not exist', async () => {
    mockGetAll.mockResolvedValue([{ exists: false }]);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)({ courseIds: ['ghost'] }, ctx),
    ).rejects.toThrow('Курсы не найдены: ghost');
  });

  it('uses FieldValue.delete() for empty list', async () => {
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await (setMyFeaturedCourses as Function)({ courseIds: [] }, ctx);
    const setCall = mockSet.mock.calls[0][0];
    expect(setCall.featuredCourseIds).toBe('__DELETE__');
  });

  it('dedupes ids preserving order', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }, { exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    const result = await (setMyFeaturedCourses as Function)(
      { courseIds: ['A', 'B', 'A', 'B'] },
      ctx,
    );
    expect(result.courseIds).toEqual(['A', 'B']);
  });
});
