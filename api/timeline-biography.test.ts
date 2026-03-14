import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './timeline-biography.js';
import { buildTimelineDataFromBiographyPlan } from '../server/api/timelineBiography.js';

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
              extract:
                'Александр Сергеевич Пушкин родился в Москве в 1799 году. Учился в Царскосельском лицее. Публиковал стихи, был сослан, женился на Наталье Гончаровой и погиб после дуэли.',
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
        selectedPeriodization: 'erikson',
        birthDetails: {
          date: '6 июня 1799',
          place: 'Москва',
        },
        mainEvents: [
          { age: 0, label: 'Рождение', notes: 'Родился в Москве.', isDecision: false, sphere: 'family' },
          { age: 12, label: 'Поступление в лицей', isDecision: true, sphere: 'education', iconId: 'school-backpack' },
          { age: 21, label: '«Руслан и Людмила»', isDecision: true, sphere: 'career', iconId: 'idea-book' },
          { age: 25, label: 'Южная ссылка', isDecision: false, sphere: 'place', iconId: 'passport' },
          { age: 31, label: 'Брак с Натальей Гончаровой', isDecision: true, sphere: 'family', iconId: 'wedding-rings' },
          { age: 37, label: 'Дуэль и смерть', isDecision: false, sphere: 'health' },
        ],
        branches: [
          {
            label: 'Литература',
            sphere: 'career',
            sourceMainEventIndex: 1,
            events: [
              { age: 15, label: 'Первые публикации', isDecision: true, sphere: 'career' },
              { age: 26, label: '«Борис Годунов»', isDecision: true, sphere: 'career' },
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
    expect(res.body.canvasName).toBe('Пушкин');
    expect(res.body.meta.model).toBe('gemini-2.5-pro');
    expect(res.body.timeline.birthDetails.place).toBe('Москва');
    expect(res.body.timeline.nodes.some((node: { label: string }) => node.label === 'Рождение')).toBe(true);
    expect(res.body.timeline.edges).toHaveLength(1);
    expect(res.body.meta.timelineStats.nodes).toBeGreaterThan(0);
    expect(res.body.meta.planDiagnostics.source).toBe('model');
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
              extract: 'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
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
              extract: 'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
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
              extract: 'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
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
              extract: 'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent
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

    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(2);
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
              extract: 'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
              fullurl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич',
            },
          ],
        },
      }),
    });
    geminiMocks.generateContent
      .mockResolvedValueOnce({ text: 'not-json' })
      .mockResolvedValueOnce({ text: 'still-not-json' })
      .mockResolvedValueOnce({ text: 'not-json-again' })
      .mockResolvedValueOnce({ text: 'still-not-json-again' })
      .mockResolvedValueOnce({
        text: [
          'SUBJECT\tАлександр Пушкин',
          'CANVAS\tПушкин',
          'CURRENT_AGE\t37',
          'PERIODIZATION\terikson',
          'BIRTH\t6 июня 1799\tМосква\t',
          'MAIN\t0\tРождение\tfamily\tfalse\t\tРодился в Москве',
          'MAIN\t12\tПоступление в лицей\teducation\ttrue\tschool-backpack\t',
          'MAIN\t21\tПубликация\tcareer\ttrue\tidea-book\t',
          'MAIN\t25\tСсылка\tplace\tfalse\tpassport\t',
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

    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(5);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta.model).toBe('gemini-2.5-pro');
    expect(res.body.timeline.birthDetails.place).toBe('Москва');
    expect(res.body.timeline.nodes.some((node: { label: string }) => node.label === 'Рождение')).toBe(true);
    expect(res.body.timeline.edges).toHaveLength(1);
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
    expect(res.body.timeline.edges.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.planDiagnostics.source).toBe('merged-with-heuristics');
    expect(res.body.meta.timelineStats.nodes).toBeGreaterThanOrEqual(4);
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
