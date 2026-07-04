/**
 * Д7 из docs/plans/timeline-invariant-audit.md: очистка последнего
 * непустого холста должна сохраняться в Firestore. Раньше guard
 * shouldPersist пропускал сохранение пустого состояния, и после
 * перезагрузки удалённые данные «воскресали».
 */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getDoc, setDoc } from 'firebase/firestore';
import { useTimelineState } from '../useTimelineState';
import type { TimelineDocument } from '../../types';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'ts'),
}));

// Дебаунс сохранения = 0, чтобы не гонять фейковые таймеры против
// планировщика React (виснет под jsdom).
vi.mock('../../constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../constants')>()),
  SAVE_DEBOUNCE_MS: 0,
}));

vi.mock('../../../../auth/AuthProvider', () => {
  // user должен быть стабильным между рендерами: он в deps эффекта
  // загрузки, новый объект на каждый вызов зацикливает getDoc.
  const user = { uid: 'u1' };
  return { useAuth: () => ({ user }) };
});

vi.mock('../../../../lib/firebase', () => ({
  db: {},
}));

const getDocMock = vi.mocked(getDoc);
const setDocMock = vi.mocked(setDoc);

function snapshotOf(docData: TimelineDocument | undefined) {
  return {
    exists: () => docData !== undefined,
    data: () => docData,
  } as unknown as Awaited<ReturnType<typeof getDoc>>;
}

const docWithContent: TimelineDocument = {
  userId: 'u1',
  activeCanvasId: 'c1',
  canvases: [
    {
      id: 'c1',
      name: 'Таймлайн 1',
      createdAt: '2026-01-01T00:00:00.000Z',
      data: {
        currentAge: 30,
        ageMax: 100,
        nodes: [{ id: 'n1', age: 10, x: 2000, label: 'Событие', isDecision: false }],
        edges: [],
        birthDetails: {},
        selectedPeriodization: null,
      },
    },
  ],
};

const flushSaveDebounce = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

describe('useTimelineState: сохранение в Firestore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Д7: очистка единственного холста доезжает до Firestore', async () => {
    getDocMock.mockResolvedValue(snapshotOf(docWithContent));

    const { result } = renderHook(() => useTimelineState());
    await act(async () => {}); // дождаться getDoc
    expect(result.current.nodes).toHaveLength(1);
    setDocMock.mockClear(); // интересует сохранение именно очистки

    act(() => {
      result.current.setNodes([]);
    });
    await flushSaveDebounce();

    expect(setDocMock).toHaveBeenCalled();
    const persisted = setDocMock.mock.calls.at(-1)![1] as TimelineDocument;
    expect(persisted.canvases![0].data.nodes).toEqual([]);
  });

  it('retrySave повторяет сохранение после ошибки', async () => {
    getDocMock.mockResolvedValue(snapshotOf(docWithContent));
    const { result } = renderHook(() => useTimelineState());
    await act(async () => {});
    setDocMock.mockClear();
    setDocMock.mockRejectedValueOnce(new Error('offline'));

    act(() => {
      result.current.setNodes([]);
    });
    await flushSaveDebounce();
    expect(result.current.saveStatus).toBe('error');

    setDocMock.mockResolvedValue(undefined);
    await act(async () => {
      result.current.retrySave();
    });
    expect(setDocMock).toHaveBeenCalledTimes(2);
    expect(result.current.saveStatus).toBe('saved');
  });

  it('не создаёт документ для нового пользователя без контента', async () => {
    getDocMock.mockResolvedValue(snapshotOf(undefined));

    renderHook(() => useTimelineState());
    await act(async () => {});
    await flushSaveDebounce();

    expect(setDocMock).not.toHaveBeenCalled();
  });
});
