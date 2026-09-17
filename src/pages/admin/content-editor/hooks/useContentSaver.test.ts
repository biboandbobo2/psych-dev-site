import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  query: vi.fn((ref: unknown) => ref),
  where: vi.fn(),
  limit: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  deleteField: vi.fn(() => '__delete__'),
  serverTimestamp: vi.fn(() => '__timestamp__'),
}));

vi.mock('../../../../lib/firebase', () => ({ db: {} }));
vi.mock('../../../../lib/courseContentCache', () => ({
  invalidateCourseContentByCourseId: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../../../lib/courseNavIndex', () => ({
  rebuildCourseNavIndex: vi.fn(() => Promise.resolve()),
}));

import { useContentSaver } from './useContentSaver';

type RefLike = { path: string };

const NEW_VIDEO_URL = 'https://www.youtube.com/watch?v=oZzCAGgsMUk';

const saveParams = {
  periodId: 'intro',
  title: 'Введение',
  subtitle: '',
  published: true,
  order: 0,
  accent: '#000000',
  accent100: '#ffffff',
  placeholderEnabled: false,
  normalizedPlaceholderText: '',
  videos: [
    { id: 'v1', title: 'Введение', url: 'https://www.youtube.com/watch?v=0q4AZ3WsAAc', deckUrl: '', audioUrl: '', isPublic: false },
    { id: 'v2', title: 'Введение 2026г', url: NEW_VIDEO_URL, deckUrl: '', audioUrl: '', isPublic: false },
  ],
  concepts: [],
  authors: [],
  coreLiterature: [],
  extraLiterature: [],
  extraVideos: [],
  leisure: [],
  selfQuestionsUrl: '',
};

describe('useContentSaver.handleSave — целевой документ', () => {
  const getDocMock = vi.mocked(getDoc);
  const getDocsMock = vi.mocked(getDocs);
  const setDocMock = vi.mocked(setDoc);
  const updateDocMock = vi.mocked(updateDoc);

  beforeEach(() => {
    getDocMock.mockReset();
    getDocsMock.mockReset();
    setDocMock.mockReset();
    updateDocMock.mockReset();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('intro курса development пишет в periods/intro, а не в legacy intro/singleton', async () => {
    getDocMock.mockImplementation(async (ref: unknown) => ({
      id: 'intro',
      exists: () => (ref as RefLike).path === 'periods/intro',
      data: () => ({ title: 'Введение' }),
    }) as never);
    const onNavigate = vi.fn();

    const { result } = renderHook(() => useContentSaver(onNavigate, 'development'));
    await act(async () => {
      await result.current.handleSave(saveParams);
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [ref, payload] = updateDocMock.mock.calls[0] as unknown as [RefLike, Record<string, unknown>];
    expect(ref.path).toBe('periods/intro');
    expect(JSON.stringify(payload['sections.video_section'])).toContain(NEW_VIDEO_URL);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(getDocMock.mock.calls.map(([r]) => (r as unknown as RefLike).path)).not.toContain('intro/singleton');
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('без periods/intro создаёт его, а не legacy intro/singleton', async () => {
    getDocMock.mockResolvedValue({ exists: () => false } as never);
    getDocsMock.mockResolvedValue({ empty: true, docs: [] } as never);

    const { result } = renderHook(() => useContentSaver(vi.fn(), 'development'));
    await act(async () => {
      await result.current.handleSave(saveParams);
    });

    expect(updateDocMock).not.toHaveBeenCalled();
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [ref, payload] = setDocMock.mock.calls[0] as unknown as [RefLike, { sections: Record<string, unknown> }];
    expect(ref.path).toBe('periods/intro');
    expect(JSON.stringify(payload.sections.video_section)).toContain(NEW_VIDEO_URL);
  });

  it('занятие динамического курса пишет в courses/{id}/lessons/{lessonId}', async () => {
    const { result } = renderHook(() => useContentSaver(vi.fn(), 'external-x'));
    await act(async () => {
      await result.current.handleSave({ ...saveParams, periodId: 'lesson-1' });
    });

    expect(getDocMock).not.toHaveBeenCalled();
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [ref] = setDocMock.mock.calls[0] as unknown as [RefLike];
    expect(ref.path).toBe('courses/external-x/lessons/lesson-1');
  });
});
