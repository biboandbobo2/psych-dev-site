import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockSet, mockGetAll, mockDoc, mockCollection,
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

vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

import { setMyFeaturedCourses } from './users';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setMyFeaturedCourses', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((setMyFeaturedCourses as Function)({ data: { courseIds: [] } })).rejects.toThrow(
      'Требуется авторизация',
    );
  });

  it('writes own featured courses for self', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }, { exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    const result = await (setMyFeaturedCourses as Function)({ data: { courseIds: ['A', 'B'] }, ...ctx });
    expect(result).toEqual({ success: true, courseIds: ['A', 'B'] });
    expect(mockDoc).toHaveBeenCalledWith('u1');
    const setCall = mockSet.mock.calls[0][0];
    expect(setCall.featuredCourseIds).toEqual(['A', 'B']);
  });

  it('rejects writing for someone else when caller is regular user', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)({ data: { targetUid: 'other-uid', courseIds: ['A'] }, ...ctx }),
    ).rejects.toThrow('Только сам пользователь или super-admin');
  });

  it('allows super-admin to write for another user', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'sa', token: { email: SUPER_ADMIN_EMAIL } } };
    const result = await (setMyFeaturedCourses as Function)({ data: { targetUid: 'other-uid', courseIds: ['A'] }, ...ctx });
    expect(result.courseIds).toEqual(['A']);
    expect(mockDoc).toHaveBeenCalledWith('other-uid');
  });

  it('accepts more than 3 courseIds (no product limit)', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }, { exists: true }, { exists: true }, { exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    const result = await (setMyFeaturedCourses as Function)({ data: { courseIds: ['A', 'B', 'C', 'D'] }, ...ctx });
    expect(result.courseIds).toEqual(['A', 'B', 'C', 'D']);
  });

  it('throws above the technical cap of 50 ids', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    const ids = Array.from({ length: 51 }, (_, i) => `c${i}`);
    await expect(
      (setMyFeaturedCourses as Function)({ data: { courseIds: ids }, ...ctx }),
    ).rejects.toThrow('не больше 50');
  });

  it('writes unfeaturedCourseIds when passed, deletes when empty', async () => {
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await (setMyFeaturedCourses as Function)({ data: { courseIds: [], unfeaturedCourseIds: ['S1', 'S1'] }, ...ctx });
    expect(mockSet.mock.calls[0][0].unfeaturedCourseIds).toEqual(['S1']);
    await (setMyFeaturedCourses as Function)({ data: { courseIds: [], unfeaturedCourseIds: [] }, ...ctx });
    expect(mockSet.mock.calls[1][0].unfeaturedCourseIds).toBe('__DELETE__');
  });

  it('leaves unfeaturedCourseIds untouched for old clients', async () => {
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await (setMyFeaturedCourses as Function)({ data: { courseIds: [] }, ...ctx });
    expect('unfeaturedCourseIds' in mockSet.mock.calls[0][0]).toBe(false);
  });

  it('throws when courseIds not an array', async () => {
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)({ data: { courseIds: 'oops' }, ...ctx }),
    ).rejects.toThrow('courseIds must be an array');
  });

  it('throws when course does not exist', async () => {
    mockGetAll.mockResolvedValue([{ exists: false }]);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await expect(
      (setMyFeaturedCourses as Function)({ data: { courseIds: ['ghost'] }, ...ctx }),
    ).rejects.toThrow('Курсы не найдены: ghost');
  });

  it('uses FieldValue.delete() for empty list', async () => {
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    await (setMyFeaturedCourses as Function)({ data: { courseIds: [] }, ...ctx });
    const setCall = mockSet.mock.calls[0][0];
    expect(setCall.featuredCourseIds).toBe('__DELETE__');
  });

  it('dedupes ids preserving order', async () => {
    mockGetAll.mockResolvedValue([{ exists: true }, { exists: true }]);
    mockSet.mockResolvedValue(undefined);
    const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };
    const result = await (setMyFeaturedCourses as Function)({ data: { courseIds: ['A', 'B', 'A', 'B'] }, ...ctx });
    expect(result.courseIds).toEqual(['A', 'B']);
  });
});
