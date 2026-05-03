import { beforeEach, describe, expect, it, vi } from 'vitest';

const geminiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

const verifyIdTokenMock = vi.hoisted(() => vi.fn());

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

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        set: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
  FieldValue: {
    increment: (n: number) => n,
  },
  Timestamp: {
    now: () => ({}),
  },
}));

import handler, { truncateResponse } from '../../api/assistant.js';

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Default headers для authed BYOK-запроса (после wave-7 /api/assistant требует
 * Bearer ID token + X-Gemini-Api-Key).
 */
const AUTHED_HEADERS: Record<string, string> = {
  'content-type': 'application/json',
  authorization: 'Bearer fake-id-token',
  'x-gemini-api-key': 'user-byok-key',
};

const mockReq = (
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) =>
  ({
    method: options.method ?? 'POST',
    headers: options.headers ?? AUTHED_HEADERS,
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

function setupAuthMock() {
  verifyIdTokenMock.mockReset();
  verifyIdTokenMock.mockResolvedValue({ uid: 'test-user', email: 'test@example.com' });
}

// ============================================================================
// TRUNCATE RESPONSE TESTS
// ============================================================================

describe('truncateResponse', () => {
  it('возвращает пустую строку для пустого ввода', () => {
    expect(truncateResponse('')).toBe('');
    expect(truncateResponse(null as any)).toBe('');
    expect(truncateResponse(undefined as any)).toBe('');
  });

  it('сохраняет текст если он короче лимитов', () => {
    const shortText = 'Короткий ответ о психологии.';
    expect(truncateResponse(shortText)).toBe(shortText);
  });

  it('ограничивает до 6 абзацев', () => {
    const sevenParagraphs = [
      'Первый абзац про теорию привязанности.',
      'Второй абзац про стадии развития.',
      'Третий абзац про когнитивное развитие.',
      'Четвертый абзац про эмоциональный интеллект.',
      'Пятый абзац про социализацию.',
      'Шестой абзац про нейропсихологию.',
      'Седьмой абзац про психотерапию.',
    ].join('\n\n');

    const result = truncateResponse(sevenParagraphs);
    const paragraphs = result.split('\n\n');

    expect(paragraphs.length).toBe(6);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('Седьмой абзац');
  });

  it('ограничивает до 3000 символов', () => {
    const longParagraph = 'Это очень длинный абзац. '.repeat(150); // ~3750 chars
    const result = truncateResponse(longParagraph);

    expect(result.length).toBeLessThanOrEqual(3001); // 3000 + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('сохраняет разбивку на абзацы', () => {
    const twoParagraphs = 'Первый абзац.\n\nВторой абзац.';
    const result = truncateResponse(twoParagraphs);

    expect(result).toBe(twoParagraphs);
    expect(result.split('\n\n').length).toBe(2);
  });

  it('не добавляет ellipsis если текст не обрезан', () => {
    const normalText = 'Нормальный ответ про когнитивное развитие.';
    const result = truncateResponse(normalText);

    expect(result).toBe(normalText);
    expect(result.endsWith('…')).toBe(false);
  });

  it('обрезает на границе предложения если возможно', () => {
    const base = 'Предложение про психологию развития. ';
    const text = base.repeat(100); // ~3700 chars, many sentence boundaries

    const result = truncateResponse(text);

    expect(result).toMatch(/\.\s*…$/);
    expect(result.length).toBeLessThanOrEqual(3001);
  });
});

// ============================================================================
// INPUT VALIDATION TESTS
// ============================================================================

describe('api/assistant validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis['console'], 'error').mockImplementation(() => {});
    setupAuthMock();
    geminiMocks.generateContent.mockReset();
    geminiMocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        allowed: true,
        answer: 'Краткий ответ по психологии.',
      }),
    });
  });

  it('возвращает 405 для не-POST запросов', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('возвращает 200 для OPTIONS (CORS preflight)', async () => {
    const req = mockReq({ method: 'OPTIONS' });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
  });

  it('возвращает 400 для пустого тела', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('MISSING_MESSAGE');
  });

  it('возвращает 400 для пустого message', async () => {
    const req = mockReq({ body: { message: '' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    // Empty string is falsy, so it's treated as missing
    expect(res.body.code).toBe('MISSING_MESSAGE');
  });

  it('возвращает 400 для пробельного message', async () => {
    const req = mockReq({ body: { message: '   ' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('EMPTY_MESSAGE');
  });

  it('возвращает 400 для message > 200 символов', async () => {
    const longMessage = 'a'.repeat(201);
    const req = mockReq({ body: { message: longMessage } });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('MESSAGE_TOO_LONG');
  });

  it('принимает message ровно 200 символов', async () => {
    const exactMessage = 'a'.repeat(200);
    const req = mockReq({ body: { message: exactMessage } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('возвращает 400 для невалидного JSON', async () => {
    const req = mockReq({ body: 'not valid json string that was not parsed' });
    req.body = 'invalid{json';
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });
});

// ============================================================================
// AUTH / BYOK TESTS (wave-7 BYOK enforcement)
// ============================================================================

describe('api/assistant BYOK + auth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis['console'], 'error').mockImplementation(() => {});
    setupAuthMock();
    geminiMocks.generateContent.mockReset();
    geminiMocks.generateContent.mockResolvedValue({
      text: JSON.stringify({ allowed: true, answer: 'Ответ.' }),
    });
  });

  it('возвращает 401 если нет Authorization header', async () => {
    const req = mockReq({
      body: { message: 'Что такое привязанность?' },
      headers: { 'content-type': 'application/json' },
    });
    req.socket = { remoteAddress: '10.0.0.20' };
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('возвращает 401 если Bearer token невалидный', async () => {
    verifyIdTokenMock.mockRejectedValueOnce(new Error('invalid'));

    const req = mockReq({
      body: { message: 'Что такое привязанность?' },
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer bad-token',
      },
    });
    req.socket = { remoteAddress: '10.0.0.21' };
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('возвращает 402 BYOK_REQUIRED если X-Gemini-Api-Key отсутствует', async () => {
    const req = mockReq({
      body: { message: 'Что такое привязанность?' },
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer fake-id-token',
        // нет x-gemini-api-key
      },
    });
    req.socket = { remoteAddress: '10.0.0.22' };
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(402);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe('BYOK_REQUIRED');
  });
});

// ============================================================================
// GEMINI RESPONSE HANDLING TESTS
// ============================================================================

describe('api/assistant Gemini response handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis['console'], 'error').mockImplementation(() => {});
    setupAuthMock();
    geminiMocks.generateContent.mockReset();
  });

  it('возвращает refused=true когда модель отклоняет вопрос', async () => {
    geminiMocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        allowed: false,
        answer: 'Извините, этот вопрос не относится к психологии.',
      }),
    });

    const req = mockReq({
      body: { message: 'Как приготовить борщ?' },
    });
    req.socket = { remoteAddress: '10.0.0.1' };
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.refused).toBe(true);
    expect(res.body.answer).toContain('не относится к психологии');
  });
});
