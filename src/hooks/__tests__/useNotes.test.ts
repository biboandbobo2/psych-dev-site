import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../auth/AuthProvider';
import { useNotes } from '../useNotes';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
}));

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

describe('useNotes', () => {
  const onSnapshotMock = vi.mocked(onSnapshot);
  const authMock = vi.mocked(useAuth);

  beforeEach(() => {
    onSnapshotMock.mockClear();
    authMock.mockReset();
  });

  it('не запускает realtime listener когда subscribe=false', async () => {
    authMock.mockReturnValue({ user: { uid: 'user-123' } });

    const { result } = renderHook(() => useNotes(null, { subscribe: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(onSnapshotMock).not.toHaveBeenCalled();
    expect(result.current.notes).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
