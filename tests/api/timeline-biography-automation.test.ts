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
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: [
        'SUBJECT\tАлександр Пушкин',
        'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.',
        'FACT\t1805\t6\teducation\teducation\tmedium\tУвлечение чтением\tМного читал в домашней библиотеке.',
        'FACT\t1811\t12\teducation\teducation\thigh\tПоступление в лицей\tНачал обучение в Царскосельском лицее.',
        'FACT\t1815\t16\tpublication\tcreativity\thigh\tПервое признание\tПолучил известность после лицейского выступления.',
        'FACT\t1817\t18\tcareer\tcareer\tmedium\tНачало службы\tПоступил на службу после окончания лицея.',
        'FACT\t1820\t21\tpublication\tcreativity\thigh\t«Руслан и Людмила»\tОпубликовал поэму.',
        'FACT\t1831\t31\tfamily\tfamily\thigh\tБрак с Натальей Гончаровой\tЖенился.',
        'FACT\t1837\t37\tdeath\thealth\thigh\tДуэль и смерть\tПогиб после дуэли.',
      ].join('\n'),
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
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(1);
    expect(res.body.meta.factsModel).toBe('gemini-2.5-flash');
    expect(res.body.timeline.nodes.length).toBeGreaterThan(0);
  });
});
