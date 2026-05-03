import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/timeline-biography.js';
import {
  buildTimelineDataFromBiographyPlan,
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
  getUser: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  docData: null as Record<string, unknown> | null,
  setData: null as Record<string, unknown> | null,
  updateData: null as Record<string, unknown> | null,
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
    getUser: authMocks.getUser,
  }),
}));

vi.mock('firebase-admin/firestore', () => {
  const mockDocRef = {
    id: 'test-job-id',
    set: vi.fn(async (data: Record<string, unknown>) => { firestoreMocks.setData = data; }),
    update: vi.fn(async (data: Record<string, unknown>) => { firestoreMocks.updateData = data; }),
    get: vi.fn(async () => ({
      exists: Boolean(firestoreMocks.docData),
      data: () => firestoreMocks.docData,
    })),
  };
  return {
    getFirestore: () => ({
      collection: () => ({ doc: (id?: string) => id ? mockDocRef : mockDocRef }),
    }),
    FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
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
    authMocks.getUser.mockReset();
    authMocks.getUser.mockResolvedValue({ uid: 'user-1', email: 'test@example.com' });
    firestoreMocks.docData = null;
    firestoreMocks.setData = null;
    firestoreMocks.updateData = null;
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
        'x-gemini-api-key': 'AIzaSy-test-key',
      },
      body: { step: 1, sourceUrl: 'https://example.com/pushkin' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Wikipedia');
  });

  it('step 1: извлекает факты из Wikipedia и сохраняет в Firestore', async () => {
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
    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
        'x-gemini-api-key': 'AIzaSy-test-key',
      },
      body: { step: 1, slice: 0, sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич', canvasId: 'canvas-1' },
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
    // Step 1 = extraction only (1 Gemini call)
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(1);
    expect(res.body.ok).toBe(true);
    expect(res.body.jobId).toBe('test-job-id');
    expect(res.body.subjectName).toBe('Пушкин, Александр Сергеевич');
    expect(res.body.factsCount).toBeGreaterThanOrEqual(6);
    // Verify Firestore write
    expect(firestoreMocks.setData).not.toBeNull();
    expect(firestoreMocks.setData!.status).toBe('step1_done');
    expect(firestoreMocks.setData!.userId).toBe('user-1');
    expect(firestoreMocks.setData!.step1).toHaveProperty('extract');
  });

  it('требует BYOK ключ — без X-Gemini-Api-Key возвращает 402 BYOK_REQUIRED', async () => {
    const req = mockReq({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: { sourceUrl: 'https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(402);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('BYOK_REQUIRED');
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

