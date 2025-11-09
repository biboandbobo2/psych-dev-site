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

  const eventPayload = { age: 30, label: 'Milestone', x: 2000, notes: 'note', isDecision: false } as const;

  beforeEach(() => {
    docMock.mockClear();
    getDocMock.mockClear();
    setDocMock.mockClear();
    tsMock.mockClear();
    getDocMock.mockResolvedValue({ exists: () => false });
    setDocMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when user is not authenticated', async () => {
    authMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useTimeline());

    await expect(result.current.addEventToTimeline(eventPayload)).rejects.toThrow('Пользователь не авторизован');
  });

  it('creates an event when user exists', async () => {
    authMock.mockReturnValue({ user: { uid: 'user-123' } });
    const randomUUIDSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('event-1');

    const { result } = renderHook(() => useTimeline());

    await expect(result.current.addEventToTimeline(eventPayload)).resolves.toBe('event-1');

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
