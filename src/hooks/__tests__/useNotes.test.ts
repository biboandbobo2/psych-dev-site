import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDoc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../auth/AuthProvider';
import { useNotes } from '../useNotes';
import {
  buildLectureNoteDocumentId,
  buildLectureNoteKey,
} from '../../types/notes';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_db, collectionName, id) => ({ collectionName, id })),
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
  const addDocMock = vi.mocked(addDoc);
  const getDocMock = vi.mocked(getDoc);
  const setDocMock = vi.mocked(setDoc);
  const updateDocMock = vi.mocked(updateDoc);
  const authMock = vi.mocked(useAuth);

  beforeEach(() => {
    onSnapshotMock.mockClear();
    addDocMock.mockReset();
    getDocMock.mockReset();
    setDocMock.mockReset();
    updateDocMock.mockReset();
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

  it('создаёт lecture note c детерминированным id и универсальным контекстом', async () => {
    authMock.mockReturnValue({ user: { uid: 'user-123' } });
    getDocMock.mockResolvedValue({ exists: () => false } as never);

    const { result } = renderHook(() => useNotes(null, { subscribe: false }));

    await result.current.upsertLectureNote('Новый конспект', {
      courseId: 'development',
      periodId: 'seminary',
      periodTitle: 'Семинары',
      lectureTitle: 'Семинары',
      lectureVideoId: 'eGCP_Fk7AeU',
    }, {
      lectureSegments: [
        {
          id: 'segment-1',
          startMs: 120000,
          text: 'Новый конспект',
        },
      ],
    });

    const expectedId = buildLectureNoteDocumentId('user-123', {
      courseId: 'development',
      periodId: 'seminary',
      lectureVideoId: 'eGCP_Fk7AeU',
    });

    expect(setDocMock).toHaveBeenCalledWith(
      { collectionName: 'notes', id: expectedId },
      expect.objectContaining({
        title: 'Семинары',
        content: 'Новый конспект',
        courseId: 'development',
        periodId: 'seminary',
        periodTitle: 'Семинары',
        lectureVideoId: 'eGCP_Fk7AeU',
        lectureKey: buildLectureNoteKey({
          courseId: 'development',
          periodId: 'seminary',
          lectureVideoId: 'eGCP_Fk7AeU',
        }),
        lectureSegments: [
          {
            id: 'segment-1',
            startMs: 120000,
            text: 'Новый конспект',
          },
        ],
        noteScope: 'lecture',
      })
    );
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('создаёт manual note c course и period context', async () => {
    authMock.mockReturnValue({ user: { uid: 'user-123' } });
    addDocMock.mockResolvedValue({ id: 'note-1' } as never);

    const { result } = renderHook(() => useNotes(null, { subscribe: false }));

    await result.current.createManualNote('Моя заметка', 'Содержимое', {
      courseId: 'development',
      periodId: 'seminary',
      periodTitle: 'Семинары',
    });

    expect(addDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Моя заметка',
        content: 'Содержимое',
        courseId: 'development',
        periodId: 'seminary',
        periodKey: 'development::seminary',
        periodTitle: 'Семинары',
        noteScope: 'manual',
      })
    );
  });

  it('читает существующую lecture note по детерминированному id', async () => {
    authMock.mockReturnValue({ user: { uid: 'user-123' } });
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: 'user-123',
        title: 'Семинары',
        content: 'Сохранённый конспект',
        courseId: 'development',
        periodId: 'seminary',
        periodKey: 'development::seminary',
        periodTitle: 'Семинары',
        noteScope: 'lecture',
        lectureVideoId: 'eGCP_Fk7AeU',
        lectureKey: buildLectureNoteKey({
          courseId: 'development',
          periodId: 'seminary',
          lectureVideoId: 'eGCP_Fk7AeU',
        }),
        createdAt: { toDate: () => new Date('2026-03-08T10:00:00.000Z') },
        updatedAt: { toDate: () => new Date('2026-03-08T10:05:00.000Z') },
      }),
    } as never);

    const { result } = renderHook(() => useNotes(null, { subscribe: false }));

    const note = await result.current.getLectureNote({
      courseId: 'development',
      periodId: 'seminary',
      periodTitle: 'Семинары',
      lectureTitle: 'Семинары',
      lectureVideoId: 'eGCP_Fk7AeU',
    });

    expect(note).toEqual(
      expect.objectContaining({
        title: 'Семинары',
        content: 'Сохранённый конспект',
        courseId: 'development',
        periodId: 'seminary',
        noteScope: 'lecture',
      })
    );
  });

  it('обновляет существующую lecture note вместо создания новой', async () => {
    authMock.mockReturnValue({ user: { uid: 'user-123' } });
    getDocMock.mockResolvedValue({ exists: () => true } as never);

    const { result } = renderHook(() => useNotes(null, { subscribe: false }));

    await result.current.upsertLectureNote('Обновлённый конспект', {
      courseId: 'development',
      periodId: 'seminary',
      periodTitle: 'Семинары',
      lectureTitle: 'Семинары',
      lectureVideoId: 'eGCP_Fk7AeU',
    }, {
      lectureSegments: [
        {
          id: 'segment-2',
          startMs: 90000,
          text: 'Обновлённый конспект',
        },
      ],
    });

    const expectedId = buildLectureNoteDocumentId('user-123', {
      courseId: 'development',
      periodId: 'seminary',
      lectureVideoId: 'eGCP_Fk7AeU',
    });

    expect(updateDocMock).toHaveBeenCalledWith(
      { collectionName: 'notes', id: expectedId },
      expect.objectContaining({
        content: 'Обновлённый конспект',
        courseId: 'development',
        lectureSegments: [
          {
            id: 'segment-2',
            startMs: 90000,
            text: 'Обновлённый конспект',
          },
        ],
        periodId: 'seminary',
        noteScope: 'lecture',
      })
    );
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
