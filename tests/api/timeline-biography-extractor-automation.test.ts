import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/timeline-biography-extractor-automation.js';

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

  it('возвращает raw facts из url-context extractor path', async () => {
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: [
        'SUBJECT\tМахатма Ганди',
        'BIRTH_YEAR\t1869',
        'DEATH_YEAR\t1948',
        'FACT\t1869\t0\tbirth\tfamily\thigh\tРождение в Порбандаре\tРодился в Порбандаре.\tБиография\thigh\texact\t0\t0\tfamily_household\t\t\t0 лет',
        'FACT\t1888\t19\teducation\teducation\thigh\tПоездка в Лондон\tВ 19 лет отправился в Лондон и получил юридическое образование.\tБиография\thigh\tyear\t19\t19\teducation|travel_moves_exile\t\t\t19 лет',
        'FACT\t1893\t24\tcareer\tcareer\thigh\tПереезд в Южную Африку\tОтправился работать в Южную Африку и вступил в борьбу за права индийцев.\tБиография\thigh\tyear\t24\t24\tservice_career|travel_moves_exile\t\t\t24 года',
      ].join('\n'),
      candidates: [
        {
          urlContextMetadata: {
            urlMetadata: [
              {
                retrievedUrl: 'https://ru.wikipedia.org/wiki/Махатма_Ганди',
                urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS',
              },
            ],
          },
        },
      ],
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
    expect(res.body.meta.strategy).toBe('url-context');
    expect(res.body.meta.promptVersion).toBe('url-context-extractor-v1');
    expect(res.body.meta.urlContextMetadata[0].urlRetrievalStatus).toContain('SUCCESS');
    expect(res.body.facts.length).toBe(3);
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(1);
  });
});
