import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../auth/AuthProvider';
import { useTimeline } from '../useTimeline';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'ts'),
}));

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

describe('useTimeline', () => {
  const authMock = vi.mocked(useAuth);
  const docMock = vi.mocked(doc);
  const getDocMock = vi.mocked(getDoc);
  const setDocMock = vi.mocked(setDoc);
  const tsMock = vi.mocked(serverTimestamp);
  const baseAuthValue: ReturnType<typeof useAuth> = {
    user: null,
    loading: false,
    userRole: null,
    courseAccess: null,
    isGuest: false,
    isStudent: false,
    isAdmin: false,
    isSuperAdmin: false,
    signInWithGoogle: async () => undefined,
    logout: async () => undefined,
    hasCourseAccess: () => false,
  };
  const missingSnapshot = {
    exists: () => false,
    data: () => undefined,
  } as Awaited<ReturnType<typeof getDoc>>;

  const eventPayload = { age: 30, label: 'Milestone', x: 2000, notes: 'note', isDecision: false } as const;

  beforeEach(() => {
    docMock.mockClear();
    getDocMock.mockClear();
    setDocMock.mockClear();
    tsMock.mockClear();
    getDocMock.mockResolvedValue(missingSnapshot);
    setDocMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when user is not authenticated', async () => {
    authMock.mockReturnValue(baseAuthValue);

    const { result } = renderHook(() => useTimeline());

    await expect(result.current.addEventToTimeline(eventPayload)).rejects.toThrow('Пользователь не авторизован');
  });

  it('creates an event when user exists', async () => {
    authMock.mockReturnValue({
      ...baseAuthValue,
      user: { uid: 'user-123' } as NonNullable<ReturnType<typeof useAuth>['user']>,
    });
    const randomUUIDSpy = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('00000000-0000-4000-8000-000000000001');

    const { result } = renderHook(() => useTimeline());

    await expect(result.current.addEventToTimeline(eventPayload)).resolves.toBe(
      '00000000-0000-4000-8000-000000000001'
    );

    expect(docMock).toHaveBeenCalledWith({}, 'timelines', 'user-123');
    expect(getDocMock).toHaveBeenCalledWith(docMock.mock.results[0].value);
    expect(setDocMock).toHaveBeenCalledWith(
      docMock.mock.results[0].value,
      expect.objectContaining({
        userId: 'user-123',
        updatedAt: 'ts',
      }),
      { merge: true }
    );

    randomUUIDSpy.mockRestore();
  });
});
