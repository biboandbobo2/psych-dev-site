import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useResearchSearch } from '../useResearchSearch';

const mockResponse = {
  query: 'attachment',
  results: [],
  meta: {
    tookMs: 10,
    cached: false,
    sourcesUsed: ['openalex'],
    allowListApplied: true,
  },
};

describe('useResearchSearch', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('делает запрос после ввода запроса длиной >=3 с debounce', async () => {
    const { result } = renderHook(() =>
      useResearchSearch({ mode: 'drawer', trigger: 'manual' })
    );

    act(() => {
      result.current.setQuery('attachment');
    });

    act(() => {
      result.current.runSearch();
    });

    await waitFor(() => {
      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    const calledUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/papers?');
    expect(calledUrl).toContain('attachment');
    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    }, { timeout: 3000 });
  });
});
