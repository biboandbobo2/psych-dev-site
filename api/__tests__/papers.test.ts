import { describe, expect, it, vi, beforeEach } from 'vitest';
import handler from '../papers';

const mockReq = (query: Record<string, unknown> = {}) =>
  ({
    method: 'GET',
    headers: {},
    query,
    socket: { remoteAddress: '127.0.0.1' },
  }) as any;

const mockRes = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(key: string, value: string) {
      res.headers[key] = value;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
};

describe('api/papers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('валидация q < 3 символов возвращает 400', async () => {
    const req = mockReq({ q: 'ab' });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as any).code).toBe('INVALID_QUERY');
  });

  it('ограничивает limit до MAX_LIMIT', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const req = mockReq({ q: 'attachment', limit: '100' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    // candidateLimit для drawer mode (default) = 30
    expect(calledUrl.searchParams.get('per-page')).toBe('30');
  });

  it('ограничивает fallback S2 до 5 запросов', async () => {
    const openAlexPayload = {
      results: Array.from({ length: 10 }).map((_, idx) => ({
        id: `W${idx}`,
        display_name: `Item ${idx}`,
        publication_year: 2020,
        authorships: [],
        primary_location: {},
        open_access: {},
        doi: `10.1234/example${idx}`,
        abstract_inverted_index: null,
      })),
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith('https://api.openalex.org')) {
        return Promise.resolve({ ok: true, json: async () => openAlexPayload });
      }
      return Promise.resolve({ ok: true, json: async () => ({ abstract: 'fallback' }) });
    });
    // @ts-ignore
    global.fetch = fetchMock;

    const req = mockReq({ q: 'attachment', limit: '10', mode: 'page' });
    const res = mockRes();
    await handler(req, res);

    // 1 OpenAlex + <=5 S2 calls
    const s2Calls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('api.semanticscholar.org')
    );
    expect(s2Calls.length).toBeLessThanOrEqual(5);
    expect(res.statusCode).toBe(200);
  });
});
