import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBiographyImport } from '../useBiographyImport';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
}));

vi.mock('../../../../lib/firebase', () => ({
  db: {},
}));

vi.mock('../../../../lib/apiAuth', () => ({
  buildAuthorizedHeaders: vi.fn(async (extra) => ({ ...extra, Authorization: 'Bearer test' })),
}));

vi.mock('../../../../lib/errorHandler', () => ({
  reportAppError: vi.fn(),
}));

const authStoreMock = vi.hoisted(() => ({
  useAuthStore: vi.fn((selector: (state: { geminiApiKey: string | null }) => unknown) =>
    selector({ geminiApiKey: null })
  ),
}));
vi.mock('../../../../stores/useAuthStore', () => authStoreMock);

describe('useBiographyImport — state transitions', () => {
  const applyTimeline = vi.fn();

  beforeEach(() => {
    applyTimeline.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderImportHook() {
    return renderHook(() =>
      useBiographyImport({
        activeTimelineId: 'canvas-1',
        activeTimelineName: 'Таймлайн 1',
        applyTimeline,
      })
    );
  }

  it('opens the import flow and clears prior error/meta', () => {
    const { result } = renderImportHook();

    act(() => {
      result.current.open();
    });

    expect(result.current.expanded).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.meta).toBeNull();
  });

  it('closes when not loading', () => {
    const { result } = renderImportHook();
    act(() => {
      result.current.open();
      result.current.handleSourceUrlChange('https://wikipedia.org/wiki/X');
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.expanded).toBe(false);
    expect(result.current.sourceUrl).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('handleSourceUrlChange updates the url and clears the error', async () => {
    const { result } = renderImportHook();

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.handleSourceUrlChange('https://ru.wikipedia.org/wiki/Test');
    });

    expect(result.current.sourceUrl).toBe('https://ru.wikipedia.org/wiki/Test');
    expect(result.current.error).toBeNull();
  });

  it('submit with empty url returns false and surfaces an error', async () => {
    const { result } = renderImportHook();

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.submit();
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Укажите ссылку на статью Wikipedia.');
    expect(applyTimeline).not.toHaveBeenCalled();
  });

  it('reset() returns the hook to a clean state', () => {
    const { result } = renderImportHook();
    act(() => {
      result.current.open();
      result.current.handleSourceUrlChange('something');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.expanded).toBe(false);
    expect(result.current.sourceUrl).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('closeModal() turns the progress modal off', () => {
    const { result } = renderImportHook();
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.modalOpen).toBe(false);
  });

  it('importTimelineJsonFile(null) returns false without calling applyTimeline', async () => {
    const { result } = renderImportHook();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.importTimelineJsonFile(null);
    });
    expect(ok).toBe(false);
    expect(applyTimeline).not.toHaveBeenCalled();
  });

  it('importTimelineJsonFile applies a valid timeline JSON', async () => {
    const { result } = renderImportHook();
    const timeline = {
      currentAge: 25,
      ageMax: 100,
      nodes: [{ id: 'n1', age: 18, label: 'Школа', isDecision: false }],
      edges: [],
      birthDetails: {},
      selectedPeriodization: null,
    };
    const text = JSON.stringify(timeline);
    const file = new File([text], 'subject.json', { type: 'application/json' });
    // jsdom's File.text() can be flaky; pin it.
    Object.defineProperty(file, 'text', { value: async () => text });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.importTimelineJsonFile(file);
    });

    expect(ok).toBe(true);
    expect(applyTimeline).toHaveBeenCalledTimes(1);
    expect(applyTimeline).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasName: 'subject',
        timeline: expect.objectContaining({ nodes: expect.any(Array) }),
      })
    );
    expect(result.current.expanded).toBe(false);
  });

  it('importTimelineJsonFile surfaces an error on invalid JSON', async () => {
    const { result } = renderImportHook();
    const text = 'not-json{';
    const file = new File([text], 'broken.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => text });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.importTimelineJsonFile(file);
    });

    expect(ok).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(applyTimeline).not.toHaveBeenCalled();
  });
});
