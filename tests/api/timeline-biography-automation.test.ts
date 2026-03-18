import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/timeline-biography-automation.js';

const geminiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: geminiMocks.generateContent,
    };

    constructor(_options: { apiKey: string }) {}
  }

  return {
    GoogleGenAI: MockGoogleGenAI,
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

describe('api/timeline-biography-automation', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    geminiMocks.generateContent.mockReset();
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
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('X-Gemini-Api-Key');
  });

  it('строит таймлайн без пользовательской auth, если передан BYOK', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Пушкин, Александр Сергеевич',
              extract: [
                'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
                'В 1811 году поступил в Царскосельский лицей.',
                'В 1820 году опубликовал поэму «Руслан и Людмила».',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    // 1. Extraction
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        { year: 1799, text: 'Родился в Москве', category: 'birth', sphere: 'family' },
        { year: 1811, text: 'Поступил в Царскосельский лицей', category: 'education', sphere: 'education' },
        { year: 1820, text: 'Опубликовал «Руслан и Людмила»', category: 'publication', sphere: 'creativity' },
        { year: 1837, text: 'Погиб после дуэли', category: 'death', sphere: 'health' },
      ]),
    });
    // 2. Gap-filling
    geminiMocks.generateContent.mockResolvedValueOnce({ text: '[]' });
    // 3. Ranking
    geminiMocks.generateContent.mockResolvedValueOnce({ text: '0\t5\n1\t4\n2\t5\n3\t5' });
    // 4. Enrichment
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: '0\tfamily_household\t\tРождение\n1\teducation\t\tЛицей\n2\tcreative_work\t\t«Руслан и Людмила»\n3\tconflict_duels\tДантес\tДуэль и смерть',
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
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(5);
    expect(res.body.facts.length).toBeGreaterThanOrEqual(4);
    expect(res.body.meta.extractionMode).toBe('two-pass');
  });
});
