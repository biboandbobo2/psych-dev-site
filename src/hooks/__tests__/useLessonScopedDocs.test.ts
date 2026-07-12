import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onSnapshot } from 'firebase/firestore';
import { useLessonScopedDocs } from '../useLessonScopedDocs';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  onSnapshot: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../stores/useAuthStore', () => {
  // Стабильный объект: user входит в deps эффекта хука, новый объект на
  // каждый вызов селектора зациклил бы эффект.
  const state = { user: { uid: 'user-1' } };
  return {
    useAuthStore: vi.fn((selector: (s: typeof state) => unknown) => selector(state)),
  };
});

type DocStub = { id: string; data: () => Record<string, unknown> };
type SnapshotHandler = (snap: { docs: DocStub[] }) => void;
type ErrorHandler = (err: Error) => void;

const onSnapshotMock = vi.mocked(onSnapshot);

const mapRecord = (id: string, data: Record<string, unknown>) => ({
  id,
  createdAt: new Date(0),
  ...data,
});

const emptySnap = { docs: [] as DocStub[] };

describe('useLessonScopedDocs — loading по первому снапшоту каждого источника', () => {
  let listeners: Array<{ onNext: SnapshotHandler; onError: ErrorHandler }>;

  beforeEach(() => {
    listeners = [];
    onSnapshotMock.mockReset();
    onSnapshotMock.mockImplementation(((
      _query: unknown,
      onNext: SnapshotHandler,
      onError: ErrorHandler
    ) => {
      listeners.push({ onNext, onError });
      return vi.fn();
    }) as unknown as typeof onSnapshot);
  });

  function renderScopedDocs() {
    // Два источника: group:g1 и own.
    return renderHook(() =>
      useLessonScopedDocs('lectureQuestions', mapRecord, 'course-1', 'period-1', ['g1'])
    );
  }

  it('держит loading=true, пока второй источник не отдал первый snapshot', () => {
    const { result } = renderScopedDocs();
    expect(listeners).toHaveLength(2);
    expect(result.current.loading).toBe(true);

    act(() => listeners[0].onNext(emptySnap));
    expect(result.current.loading).toBe(true);

    act(() => listeners[1].onNext(emptySnap));
    expect(result.current.loading).toBe(false);
  });

  it('двойная эмиссия первого источника не сбрасывает loading', () => {
    const { result } = renderScopedDocs();

    act(() => listeners[0].onNext(emptySnap));
    act(() => listeners[0].onNext(emptySnap));
    expect(result.current.loading).toBe(true);

    act(() => listeners[1].onNext(emptySnap));
    expect(result.current.loading).toBe(false);
  });

  it('ошибка источника засчитывается как его первый ответ', () => {
    const { result } = renderScopedDocs();

    act(() => listeners[0].onError(new Error('permission denied')));
    expect(result.current.loading).toBe(true);

    act(() => listeners[1].onNext(emptySnap));
    expect(result.current.loading).toBe(false);
  });
});
