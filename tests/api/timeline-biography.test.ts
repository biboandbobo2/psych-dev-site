import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/timeline-biography.js';
import {
  buildTimelineDataFromBiographyPlan,
  enrichBiographyPlan,
} from '../../server/api/timelineBiography.js';

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

  it('строит таймлайн по статье Wikipedia (two-pass pipeline)', async () => {
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

    // 1. Extraction — JSON array of facts
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        { year: 1799, text: 'Родился в Москве', category: 'birth', sphere: 'family' },
        { year: 1811, text: 'Поступил в Царскосельский лицей', category: 'education', sphere: 'education' },
        { year: 1820, text: 'Опубликовал поэму «Руслан и Людмила»', category: 'publication', sphere: 'creativity' },
        { year: 1824, text: 'Сослан на юг', category: 'move', sphere: 'place' },
        { year: 1831, text: 'Женился на Наталье Гончаровой', category: 'family', sphere: 'family' },
        { year: 1837, text: 'Погиб после дуэли', category: 'death', sphere: 'health' },
      ]),
    });
    // 2. Gap-filling — additional facts
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        { year: 1825, text: 'Завершил «Бориса Годунова»', category: 'publication', sphere: 'creativity' },
      ]),
    });
    // 3. Ranking — INDEX\tSCORE lines
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: '0\t5\n1\t4\n2\t5\n3\t4\n4\t5\n5\t5\n6\t4',
    });
    // 4. Enrichment — INDEX\tTHEMES\tPEOPLE\tSHORTLABEL lines
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: [
        '0\tfamily_household\t\tРождение в Москве',
        '1\teducation\t\tЦарскосельский лицей',
        '2\tcreative_work\t\t«Руслан и Людмила»',
        '3\ttravel_moves_exile\t\tЮжная ссылка',
        '4\tromance\tГончарова\tБрак с Гончаровой',
        '5\tconflict_duels\tДантес\tДуэль и смерть',
        '6\tcreative_work\t\t«Борис Годунов»',
      ].join('\n'),
    });
    // 5. Composition — JSON with mainLine and branches
    geminiMocks.generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        mainLine: [0, 1, 2, 3, 4, 5],
        branches: [
          { name: 'Литература', sphere: 'creativity', facts: [6] },
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
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(5);
    expect(res.body.ok).toBe(true);
    expect(res.body.subjectName).toBe('Пушкин, Александр Сергеевич');
    expect(res.body.facts.length).toBeGreaterThanOrEqual(6);
    expect(res.body.composition).toBeDefined();
    expect(res.body.meta.extractionMode).toBe('two-pass');
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

  it('разводит main events одного возраста по x без создания ветки', () => {
    const timeline = buildTimelineDataFromBiographyPlan({
      subjectName: 'Тестовый герой',
      canvasName: 'Тестовый герой',
      currentAge: 40,
      mainEvents: [
        { age: 20, label: 'Первое событие', isDecision: false },
        { age: 20, label: 'Второе событие', isDecision: true },
        { age: 25, label: 'Третье событие', isDecision: false },
      ],
      branches: [],
    });

    const sameAgeNodes = timeline.nodes.filter((node) => node.age === 20);
    expect(sameAgeNodes).toHaveLength(2);
    expect(new Set(sameAgeNodes.map((node) => node.x ?? 2000)).size).toBe(2);
    expect(timeline.edges).toHaveLength(0);
  });
});

describe('timelineBiography quality guards', () => {
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
