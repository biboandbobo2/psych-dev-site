import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/timeline-biography-extractor-automation.js';

const geminiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  createInteraction: vi.fn(),
}));

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: geminiMocks.generateContent,
    };
    interactions = {
      create: geminiMocks.createInteraction,
    };

    constructor(_options: { apiKey: string }) {}
  }

  return {
    GoogleGenAI: MockGoogleGenAI,
    ThinkingLevel: {
      HIGH: 'high',
    },
  };
});

const mockReq = (options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  ({
    method: options.method ?? 'POST',
    headers: options.headers ?? { 'content-type': 'application/json' },
    body: options.body,
    socket: { remoteAddress: '127.0.0.1' },
  }) as any;

const mockRes = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
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
    end() {
      return res;
    },
  };
  return res;
};

describe('api/timeline-biography-extractor-automation', () => {
  beforeEach(() => {
    geminiMocks.generateContent.mockReset();
    geminiMocks.createInteraction.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает 405 для не-POST запроса', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: 'Method not allowed' });
  });

  it('требует X-Gemini-Api-Key', async () => {
    const req = mockReq({
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Махатма_Ганди' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('X-Gemini-Api-Key');
  });

  it('извлекает факты через two-pass pipeline', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Махатма Ганди',
              extract: [
                'Мохандас Карамчанд Ганди родился в Порбандаре в 1869 году.',
                'В 1888 году отправился в Лондон изучать право.',
                'В 1893 году переехал в Южную Африку.',
                'В 1948 году был убит.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Махатма_Ганди',
            },
          ],
        },
      }),
    });

    // 1. Extraction
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        { year: 1869, text: 'Родился в Порбандаре', category: 'birth', sphere: 'family' },
        { year: 1888, text: 'Отправился в Лондон изучать право', category: 'education', sphere: 'education' },
        { year: 1893, text: 'Переехал в Южную Африку', category: 'move', sphere: 'place' },
        { year: 1948, text: 'Был убит', category: 'death', sphere: 'health' },
      ]),
    });
    // 2. Gap-filling
    geminiMocks.generateContent.mockResolvedValueOnce({ text: '[]' });
    // 3. Ranking
    geminiMocks.generateContent.mockResolvedValueOnce({ text: '0\t5\n1\t4\n2\t4\n3\t5' });
    // 4. Enrichment
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: '0\tfamily_household\t\tРождение\n1\teducation,travel_moves_exile\t\tЛондон\n2\ttravel_moves_exile\t\tЮжная Африка\n3\tconflict_duels\t\tУбийство',
    });
    // 5. Composition
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ mainLine: [0, 1, 2, 3], branches: [] }),
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        'x-gemini-api-key': 'user-key',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Махатма_Ганди' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta.extractionMode).toBe('two-pass');
    expect(res.body.facts.length).toBe(4);
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(5);
  });
});
