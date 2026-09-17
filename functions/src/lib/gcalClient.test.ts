import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    async getClient() {
      return { getAccessToken: async () => ({ token: 'tok' }) };
    }
  },
}));

import { patchEvent, insertEvent } from './gcalClient';

const rateLimited = () =>
  new Response(JSON.stringify({ error: { errors: [{ reason: 'rateLimitExceeded' }] } }), { status: 403 });
const ok = (id: string) => new Response(JSON.stringify({ id, updated: 'now' }), { status: 200 });

describe('gcalClient authFetch retry', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('retries 403 rateLimitExceeded and succeeds', async () => {
    fetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(ok('ev-1'));
    const promise = patchEvent('cal', 'ev-1', { summary: 'x' });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ id: 'ev-1', updated: 'now' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after the retry budget and surfaces the error', async () => {
    fetchMock.mockImplementation(async () => rateLimited());
    const promise = insertEvent('cal', { summary: 'x' });
    const assertion = expect(promise).rejects.toThrow('GCal insert failed 403');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('does not retry non-retryable errors', async () => {
    fetchMock.mockImplementation(async () => new Response('{"error":"nope"}', { status: 404 }));
    await expect(patchEvent('cal', 'ev-1', {})).rejects.toThrow('GCal patch failed 404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
