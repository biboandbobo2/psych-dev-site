import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: (_opts: unknown, fn: Function) => fn,
}));
vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn() },
}));

import { apiProxy } from './apiProxy.js';

type Handler = (req: unknown, res: unknown) => Promise<void>;
const handler = apiProxy as unknown as Handler;

function makeReq(overrides: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-gemini-api-key': 'user-key',
    cookie: 'secret=1',
    'x-forwarded-for': '203.0.113.7, 10.0.0.1',
    ...((overrides.headers as Record<string, string>) ?? {}),
  };
  return {
    method: 'POST',
    path: '/api/assistant',
    originalUrl: '/api/assistant?x=1',
    rawBody: Buffer.from('{"q":"hi"}'),
    headers,
    get: (name: string) => headers[name.toLowerCase()],
    ...overrides,
  };
}

function makeRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    set(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res;
}

describe('apiProxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('форвардит запрос на Vercel c фильтрацией заголовков и отдаёт ответ', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json', 'x-vercel-id': 'zzz' }),
      arrayBuffer: async () => new TextEncoder().encode('{"ok":true}').buffer,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = makeRes();
    await handler(makeReq(), res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://psych-dev-site.vercel.app/api/assistant?x=1');
    expect(init.method).toBe('POST');
    const sent = init.headers as Record<string, string>;
    expect(sent['x-gemini-api-key']).toBe('user-key');
    expect(sent['x-forwarded-for']).toBe('203.0.113.7');
    expect(sent.cookie).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.headers['x-vercel-id']).toBeUndefined();
    expect(String(res.body)).toBe('{"ok":true}');
  });

  it('не проксирует пути вне /api/', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = makeRes();
    await handler(makeReq({ path: '/admin', originalUrl: '/admin' }), res);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('отвечает 502, если Vercel недоступен', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      })
    );

    const res = makeRes();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'Upstream unavailable' });
  });
});
