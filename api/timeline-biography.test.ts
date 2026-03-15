import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './timeline-biography.js';
import {
  buildBiographyTimelinePrompt,
  buildTimelineDataFromBiographyPlan,
  enrichBiographyPlan,
} from '../server/api/timelineBiography.js';

const geminiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

const firebaseAppMocks = vi.hoisted(() => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(),
  cert: vi.fn((value: unknown) => value),
}));

const authMocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
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

vi.mock('firebase-admin/app', () => ({
  initializeApp: firebaseAppMocks.initializeApp,
  getApps: firebaseAppMocks.getApps,
  cert: firebaseAppMocks.cert,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: authMocks.verifyIdToken,
  }),
}));

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

describe('api/timeline-biography', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    geminiMocks.generateContent.mockReset();
    firebaseAppMocks.initializeApp.mockReset();
    firebaseAppMocks.getApps.mockReset();
    firebaseAppMocks.getApps.mockReturnValue([]);
    firebaseAppMocks.cert.mockClear();
    authMocks.verifyIdToken.mockReset();
    authMocks.verifyIdToken.mockResolvedValue({ uid: 'user-1' });
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      projectId: 'psych-dev-site-prod',
      clientEmail: 'test@example.com',
      privateKey: 'test-key',
    });
    process.env.GEMINI_API_KEY = 'server-gemini-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  it('возвращает 405 для не-POST запроса', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: 'Method not allowed' });
  });

  it('возвращает 401 без авторизации', async () => {
    const req = mockReq({
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('возвращает 400 для не-wikipedia ссылки', async () => {
    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://example.com/pushkin' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Wikipedia');
  });

  it('строит таймлайн по статье Wikipedia', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Пушкин, Александр Сергеевич',
              extract: [
                'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
                'В детстве много читал в семейной библиотеке.',
                'В 1811 году поступил в Царскосельский лицей.',
                'В 1815 году впервые выступил со стихами и получил известность в лицее.',
                'В 1820 году опубликовал поэму «Руслан и Людмила».',
                'В 1824 году был сослан на юг.',
                'В 1825 году завершил работу над «Борисом Годуновым».',
                'В 1831 году женился на Наталье Гончаровой.',
                'В 1833 году завершил роман «Евгений Онегин».',
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
        'BIRTH_YEAR\t1799',
        'DEATH_YEAR\t1837',
        'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.',
        'FACT\t1805\t6\teducation\teducation\tmedium\tУвлечение чтением\tМного читал в домашней библиотеке.',
        'FACT\t1811\t12\teducation\teducation\thigh\tПоступление в лицей\tНачал обучение в Царскосельском лицее.',
        'FACT\t1815\t16\tpublication\tcreativity\thigh\tПервое признание\tПолучил известность после лицейского выступления.',
        'FACT\t1817\t18\tcareer\tcareer\tmedium\tНачало службы\tПоступил на службу после окончания лицея.',
        'FACT\t1820\t21\tpublication\tcreativity\thigh\t«Руслан и Людмила»\tОпубликовал поэму.',
        'FACT\t1824\t25\tmove\tplace\thigh\tЮжная ссылка\tБыл сослан на юг.',
        'FACT\t1825\t26\tproject\tcreativity\thigh\t«Борис Годунов»\tЗавершил драму «Борис Годунов».',
        'FACT\t1831\t31\tfamily\tfamily\thigh\tБрак с Натальей Гончаровой\tЖенился.',
        'FACT\t1833\t34\tpublication\tcreativity\thigh\t«Евгений Онегин»\tЗавершил роман в стихах.',
        'FACT\t1837\t37\tdeath\thealth\thigh\tДуэль и смерть\tПогиб после дуэли.',
      ].join('\n'),
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(authMocks.verifyIdToken).toHaveBeenCalledWith('token');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/w/api.php?action=query'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('psych-dev-site timeline biography importer'),
        }),
      })
    );
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(1);
    expect(res.body.ok).toBe(true);
    expect(res.body.canvasName).toBe('Пушкин Александр');
    expect(res.body.meta.model).toContain('local-facts-first');
    expect(res.body.meta.factsModel).toBe('gemini-2.5-flash');
    expect(res.body.timeline.birthDetails.place).toContain('Моск');
    expect(res.body.timeline.nodes.some((node: { label: string }) => node.label === 'Рождение')).toBe(true);
    expect(res.body.timeline.edges.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.timelineStats.nodes).toBeGreaterThan(0);
    expect(res.body.meta.planDiagnostics.source).toContain('facts-first');
    expect(res.body.meta.stageDiagnostics.facts).toBeGreaterThanOrEqual(10);
    expect(res.body.meta.stageDiagnostics.reviewApplied).toBe(false);
  });

  it('использует fallback env key, если GEMINI_API_KEY не задан', async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.MY_GEMINI_KEY = 'fallback-key';

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Пушкин, Александр Сергеевич',
              extract: [
                'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
                'В 1820 году опубликовал поэму «Руслан и Людмила».',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        subjectName: 'Александр Пушкин',
        canvasName: 'Пушкин',
        currentAge: 37,
        mainEvents: [
          { age: 0, label: 'Рождение', isDecision: false },
          { age: 12, label: 'Лицей', isDecision: true },
          { age: 21, label: 'Публикация', isDecision: true },
          { age: 25, label: 'Ссылка', isDecision: false },
        ],
        branches: [],
      }),
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);

    delete process.env.MY_GEMINI_KEY;
  });

  it('возвращает понятную ошибку, если Gemini key не настроен', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.MY_GEMINI_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.VITE_GEMINI_KEY;

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Пушкин, Александр Сергеевич',
              extract: [
                'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
                'В 1820 году опубликовал поэму «Руслан и Людмила».',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Gemini API key');
  });

  it('парсит Gemini JSON с trailing commas внутри code fence', async () => {
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
                'В 1824 году был сослан на юг.',
                'В 1831 году женился на Наталье Гончаровой.',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent.mockResolvedValue({
      text: [
        '```json',
        '{',
        '  "subjectName": "Александр Пушкин",',
        '  "canvasName": "Пушкин",',
        '  "currentAge": 37,',
        '  "mainEvents": [',
        '    { "age": 0, "label": "Рождение", "isDecision": false },',
        '    { "age": 12, "label": "Лицей", "isDecision": true },',
        '    { "age": 21, "label": "Публикация", "isDecision": true },',
        '    { "age": 25, "label": "Ссылка", "isDecision": false },',
        '  ],',
        '  "branches": [],',
        '}',
        '```',
      ].join('\n'),
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.timeline.nodes.some((node: { label: string }) => node.label === 'Рождение')).toBe(true);
  });

  it('парсит Gemini JSON из candidates parts, если result.text пустой', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Пушкин, Александр Сергеевич',
              extract: 'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent.mockResolvedValue({
      text: '',
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  subjectName: 'Александр Пушкин',
                  canvasName: 'Пушкин',
                  currentAge: 37,
                  mainEvents: [
                    { age: 0, label: 'Рождение', isDecision: false },
                    { age: 12, label: 'Лицей', isDecision: true },
                    { age: 21, label: 'Публикация', isDecision: true },
                    { age: 25, label: 'Ссылка', isDecision: false },
                  ],
                  branches: [],
                }),
              },
            ],
          },
        },
      ],
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.timeline.nodes.some((node: { label: string }) => node.label === 'Рождение')).toBe(true);
  });

  it('делает relaxed retry на том же model, если structured-ответ не парсится', async () => {
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
                'В 1824 году был сослан на юг.',
                'В 1831 году женился на Наталье Гончаровой.',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent
      .mockResolvedValueOnce({ text: 'not-facts' })
      .mockResolvedValueOnce({ text: 'still-not-facts' })
      .mockResolvedValueOnce({
        text: 'not-json-at-all',
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          subjectName: 'Александр Пушкин',
          canvasName: 'Пушкин',
          currentAge: 37,
          mainEvents: [
            { age: 0, label: 'Рождение', isDecision: false },
            { age: 12, label: 'Поступление в Царскосельский лицей', isDecision: true, sphere: 'education' },
            { age: 21, label: 'Публикация «Руслан и Людмила»', isDecision: true, sphere: 'career' },
            { age: 25, label: 'Южная ссылка', isDecision: false, sphere: 'place' },
            { age: 31, label: 'Брак с Натальей Гончаровой', isDecision: true, sphere: 'family' },
            { age: 37, label: 'Дуэль и смерть', isDecision: false, sphere: 'health' },
          ],
          branches: [],
        }),
      });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(geminiMocks.generateContent.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('переходит на line-based fallback, если все JSON попытки Gemini невалидны', async () => {
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
                'В 1824 году был сослан на юг.',
                'В 1831 году женился на Наталье Гончаровой.',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent
      .mockResolvedValueOnce({ text: 'not-facts' })
      .mockResolvedValueOnce({ text: 'still-not-facts' })
      .mockResolvedValueOnce({ text: 'not-json' })
      .mockResolvedValueOnce({ text: 'still-not-json' })
      .mockResolvedValueOnce({ text: 'bad-line-plan' })
      .mockResolvedValueOnce({
        text: [
          'SUBJECT\tАлександр Пушкин',
          'CANVAS\tПушкин',
          'CURRENT_AGE\t37',
          'PERIODIZATION\terikson',
          'BIRTH\t6 июня 1799\tМосква\t',
          'MAIN\t0\tРождение\tfamily\tfalse\t\tРодился в Москве',
          'MAIN\t12\tПоступление в Царскосельский лицей\teducation\ttrue\tschool-backpack\t',
          'MAIN\t18\tОкончание Лицея\teducation\tfalse\tgraduation-cap\t',
          'MAIN\t21\tПубликация «Руслан и Людмила»\tcareer\ttrue\tidea-book\t',
          'MAIN\t25\tЮжная ссылка\tplace\tfalse\tpassport\t',
          'MAIN\t31\tБрак с Натальей Гончаровой\tfamily\ttrue\twedding-rings\t',
          'MAIN\t37\tДуэль и смерть\thealth\tfalse\tthermometer\t',
          'BRANCH\tlit\tЛитература\tcareer\t1',
          'BRANCH_EVENT\tlit\t26\tБорис Годунов\tcareer\ttrue\tidea-book\t',
        ].join('\n'),
      });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(8);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta.model).toContain('gemini-2.5');
    expect(res.body.meta.factsModel).toBe('heuristics');
    expect(res.body.timeline.birthDetails.place).toContain('Моск');
    expect(res.body.timeline.nodes.some((node: { label: string }) => node.label === 'Рождение')).toBe(true);
    expect(res.body.timeline.edges.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.stageDiagnostics.reviewApplied).toBe(false);
  });

  it('обогащает слишком бедный Gemini plan эвристиками из статьи', async () => {
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
                'В 1820 году опубликовал поэму «Руслан и Людмила» и был отправлен в южную ссылку.',
                'В 1826 году вернулся из ссылки.',
                'В 1831 году женился на Наталье Гончаровой.',
                'В 1837 году погиб после дуэли в Санкт-Петербурге.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        subjectName: 'Александр Сергеевич Пушкин',
        canvasName: 'Пушкин',
        currentAge: 37,
        mainEvents: [],
        branches: [],
      }),
    });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.timeline.nodes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.timeline.birthDetails.place).toBe('Москве');
    expect(res.body.timeline.edges.length).toBeGreaterThanOrEqual(0);
    expect(res.body.meta.planDiagnostics.source).toBe('merged-with-heuristics');
    expect(res.body.meta.timelineStats.nodes).toBeGreaterThanOrEqual(4);
    expect(res.body.meta.stageDiagnostics.reviewIssues.length).toBeGreaterThan(0);
  });

  it('не падает на слабой ветке от рождения и деградирует в heuristics', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              title: 'Пушкин, Александр Сергеевич',
              extract: [
                'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
                'В 1820 году опубликовал поэму «Руслан и Людмила».',
                'В 1837 году погиб после дуэли.',
              ].join(' '),
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent
      .mockResolvedValueOnce({
        text: [
          'SUBJECT\tАлександр Пушкин',
          'BIRTH_YEAR\t1799',
          'DEATH_YEAR\t1837',
          'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.',
          'FACT\t1820\t21\tpublication\tcareer\thigh\tРуслан и Людмила\tОпубликовал поэму.',
          'FACT\t1837\t37\tdeath\thealth\thigh\tДуэль и смерть\tПогиб после дуэли.',
        ].join('\n'),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          subjectName: 'Александр Пушкин',
          canvasName: 'Пушкин',
          currentAge: 37,
          mainEvents: [
            { age: 0, label: 'Рождение', isDecision: false, sphere: 'family' },
          ],
          branches: [
            {
              label: 'Учёба',
              sphere: 'education',
              sourceMainEventIndex: 0,
              events: [
                { age: 12, label: 'Учёба', isDecision: false, sphere: 'education' },
              ],
            },
          ],
        }),
      })
      .mockResolvedValue({
        text: JSON.stringify({
          subjectName: 'Александр Пушкин',
          canvasName: 'Пушкин',
          currentAge: 37,
          mainEvents: [
            { age: 0, label: 'Рождение', isDecision: false, sphere: 'family' },
          ],
          branches: [
            {
              label: 'Учёба',
              sphere: 'education',
              sourceMainEventIndex: 0,
              events: [
                { age: 12, label: 'Учёба', isDecision: false, sphere: 'education' },
              ],
            },
          ],
        }),
      });

    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta.planDiagnostics.source).not.toBe('model');
    expect(res.body.timeline.nodes.length).toBeGreaterThanOrEqual(3);
    expect(res.body.meta.stageDiagnostics.reviewIssues).toContain('Есть ветка education, ошибочно якорённая к рождению.');
  });
});

describe('buildTimelineDataFromBiographyPlan', () => {
  it('разводит пересекающиеся ветки по разным x-позициям', () => {
    const timeline = buildTimelineDataFromBiographyPlan({
      subjectName: 'Тестовый герой',
      canvasName: 'Тестовый герой',
      currentAge: 40,
      mainEvents: [
        { age: 10, label: 'Старт', isDecision: false },
        { age: 20, label: 'Поворот', isDecision: true },
      ],
      branches: [
        {
          label: 'Образование 1',
          sphere: 'education',
          sourceMainEventIndex: 0,
          events: [{ age: 11, label: 'Событие 1', isDecision: false }],
        },
        {
          label: 'Образование 2',
          sphere: 'education',
          sourceMainEventIndex: 0,
          events: [{ age: 12, label: 'Событие 2', isDecision: false }],
        },
      ],
    });

    expect(timeline.edges).toHaveLength(2);
    expect(new Set(timeline.edges.map((edge) => edge.x)).size).toBe(2);
    expect(timeline.nodes.filter((node) => typeof node.x === 'number')).toHaveLength(2);
  });
});

describe('timelineBiography quality guards', () => {
  it('в промпте закреплены требования против дублей и generic labels', () => {
    const prompt = buildBiographyTimelinePrompt({
      articleTitle: 'Пушкин, Александр Сергеевич',
      sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
      extract: 'Тестовый extract',
    });

    expect(prompt).toContain('Не дублируй один и тот же факт');
    expect(prompt).toContain('Не создавай generic label');
    expect(prompt).toContain('покрывать всю жизнь РАВНОМЕРНО');
    expect(prompt).toContain('терминальное событие');
  });

  it('заменяет слабый model plan эвристиками и вычищает branch-дубли', () => {
    const result = enrichBiographyPlan({
      articleTitle: 'Пушкин, Александр Сергеевич',
      extract: [
        'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
        'В 1811 году поступил в Царскосельский лицей.',
        'В 1820 году опубликовал поэму «Руслан и Людмила».',
        'В 1824 году был сослан в Михайловское.',
        'В 1826 году вернулся из ссылки.',
        'В 1831 году женился на Наталье Гончаровой.',
        'В 1833 году завершил работу над «Историей Пугачёва».',
        'В 1837 году погиб после дуэли в Санкт-Петербурге.',
      ].join(' '),
      plan: {
        subjectName: 'Александр Пушкин',
        canvasName: 'Пушкин',
        currentAge: 37,
        birthDetails: {
          date: '6 июня 1799',
          place: 'Москва',
        },
        mainEvents: [
          { age: 0, label: 'Рождение', isDecision: false, sphere: 'family' },
          { age: 12, label: 'Поступление в лицей', isDecision: true, sphere: 'education' },
          { age: 21, label: 'Публикация «Руслан и Людмила»', isDecision: true, sphere: 'career' },
        ],
        branches: [
          {
            label: 'Литература',
            sphere: 'career',
            sourceMainEventIndex: 1,
            events: [
              { age: 21, label: 'Публикация «Руслан и Людмила»', isDecision: true, sphere: 'career' },
              { age: 34, label: 'Публикация «История Пугачёва»', isDecision: true, sphere: 'career' },
            ],
          },
        ],
      },
    });

    expect(result.diagnostics.source).toBe('merged-with-heuristics');
    expect(result.plan.mainEvents.length).toBeGreaterThanOrEqual(5);
    expect(result.plan.mainEvents.some((event) => /дуэл|смерт|гибел/i.test(event.label))).toBe(true);
    expect(
      result.plan.branches.every((branch) =>
        branch.events.every((event) => !/Руслан и Людмила/i.test(event.label))
      )
    ).toBe(true);
  });
});
