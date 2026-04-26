import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adminMocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  userGet: vi.fn(),
  userSet: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [],
  cert: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: adminMocks.verifyIdToken,
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: adminMocks.userGet,
        set: adminMocks.userSet,
      }),
    }),
  }),
}));

import handler from '../../api/booking.js';

const mockReq = (options: { method?: string; query?: Record<string, string>; body?: unknown; headers?: Record<string, string> } = {}) =>
  ({
    method: options.method ?? 'POST',
    headers: options.headers ?? { 'content-type': 'application/json' },
    query: options.query ?? {},
    body: options.body,
  }) as any;

const mockRes = () => {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) { res.statusCode = code; return res; },
    setHeader(key: string, value: string) { res.headers[key] = value; return res; },
    json(payload: unknown) { res.body = payload; return res; },
    end() { return res; },
  };
  return res;
};

function successResponse(data: unknown) {
  return {
    ok: true,
    text: vi.fn().mockResolvedValue(JSON.stringify({ success: true, data })),
  } as any;
}

function emptySuccessResponse() {
  return {
    ok: true,
    text: vi.fn().mockResolvedValue(''),
  } as any;
}

describe('api/booking — busy visibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    adminMocks.verifyIdToken.mockReset();
    adminMocks.userGet.mockReset();
    adminMocks.userSet.mockReset();
    adminMocks.fetch.mockReset();
    vi.stubGlobal('fetch', adminMocks.fetch);
    process.env.ALTEG_PARTNER_TOKEN = 'partner-token';
    process.env.ALTEG_USER_TOKEN = 'user-token';
    process.env.ALTEG_COMPANY_ID = '1265772';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'psych-dev-site-prod',
      client_email: 'bot@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('не отдаёт clientName анонимному запросу busy', async () => {
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      {
        datetime: '2026-04-13T18:00:00+04:00',
        length: 3600,
        deleted: false,
        client: { name: 'Иван Иванов' },
      },
    ]));

    const req = mockReq({
      method: 'GET',
      query: { action: 'busy', staffId: '123', date: '2026-04-13' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [{ start: '2026-04-13T18:00:00+04:00', lengthSeconds: 3600 }],
    });
  });

  it('отдаёт сокращённое clientName авторизованному запросу busy', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-7', email: 'user@example.com' });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      {
        datetime: '2026-04-13T18:00:00+04:00',
        length: 3600,
        deleted: false,
        client: { name: 'Иван Иванов' },
      },
    ]));

    const req = mockReq({
      method: 'GET',
      headers: { authorization: 'Bearer token-busy' },
      query: { action: 'busy', staffId: '123', date: '2026-04-13' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [{ start: '2026-04-13T18:00:00+04:00', lengthSeconds: 3600, clientName: 'Иван И.' }],
    });
  });
});

describe('api/booking — resolveMyClientIds', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    adminMocks.verifyIdToken.mockReset();
    adminMocks.userGet.mockReset();
    adminMocks.userSet.mockReset();
    adminMocks.fetch.mockReset();
    vi.stubGlobal('fetch', adminMocks.fetch);
    process.env.ALTEG_PARTNER_TOKEN = 'partner-token';
    process.env.ALTEG_USER_TOKEN = 'user-token';
    process.env.ALTEG_COMPANY_ID = '1265772';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'psych-dev-site-prod',
      client_email: 'bot@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('отклоняет запрос без bearer token', async () => {
    const req = mockReq({ body: { action: 'resolveMyClientIds' } });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Authorization required');
  });

  it('возвращает закешированные altegClientIds без запросов в Alteg', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'real@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'real@example.com',
        phone: '+995511179241',
        altegClientIds: [101, 202],
      }),
    });

    const req = mockReq({
      headers: { authorization: 'Bearer token-123', 'content-type': 'application/json' },
      body: { action: 'resolveMyClientIds' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { altegClientIds: [101, 202], phone: '+995511179241' },
    });
    expect(adminMocks.fetch).not.toHaveBeenCalled();
    expect(adminMocks.userSet).not.toHaveBeenCalled();
  });

  it('берёт email и phone из Firestore, а не из тела запроса, и кеширует найденного клиента', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-2', email: 'token@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'real@example.com',
        phone: '+995 511 17-92-41',
        displayName: 'Real User',
      }),
    });
    adminMocks.fetch
      .mockResolvedValueOnce(successResponse([
        { id: 777, email: 'real@example.com', phone: '+995511179241', name: 'Real User' },
      ]))
      .mockResolvedValueOnce(successResponse([]));

    const req = mockReq({
      headers: { authorization: 'Bearer token-456', 'content-type': 'application/json' },
      body: {
        action: 'resolveMyClientIds',
        email: 'evil@example.com',
        phone: '+10000000000',
      },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { altegClientIds: [777], phone: '+995 511 17-92-41' },
    });

    const firstCallBody = JSON.parse(adminMocks.fetch.mock.calls[0][1].body);
    const secondCallBody = JSON.parse(adminMocks.fetch.mock.calls[1][1].body);
    expect(firstCallBody.filters[0].state.value).toBe('real@example.com');
    expect(secondCallBody.filters[0].state.value).toBe('+995511179241');
    expect(adminMocks.userSet).toHaveBeenCalledWith({ altegClientIds: [777] }, { merge: true });
  });
});

describe('api/booking — protected account actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    adminMocks.verifyIdToken.mockReset();
    adminMocks.userGet.mockReset();
    adminMocks.userSet.mockReset();
    adminMocks.fetch.mockReset();
    vi.stubGlobal('fetch', adminMocks.fetch);
    process.env.ALTEG_PARTNER_TOKEN = 'partner-token';
    process.env.ALTEG_USER_TOKEN = 'user-token';
    process.env.ALTEG_COMPANY_ID = '1265772';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'psych-dev-site-prod',
      client_email: 'bot@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clientRecords требует bearer token и игнорирует clientIds из query', async () => {
    const noAuthReq = mockReq({ method: 'GET', query: { action: 'clientRecords', clientIds: '999' } });
    const noAuthRes = mockRes();

    await handler(noAuthReq, noAuthRes);

    expect(noAuthRes.statusCode).toBe(401);

    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-3', email: 'user@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'user@example.com',
        phone: '+995511179241',
        altegClientIds: [123],
      }),
    });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 42, datetime: '2026-04-13T18:00:00+04:00', length: 3600, deleted: false },
    ]));

    const req = mockReq({
      method: 'GET',
      headers: { authorization: 'Bearer token-789' },
      query: { action: 'clientRecords', clientIds: '999,888' },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(adminMocks.fetch).toHaveBeenCalledTimes(1);
    expect(adminMocks.fetch.mock.calls[0][0]).toContain('/records/1265772?client_id=123&count=50');
  });

  it('cancelRecord отклоняет чужую запись даже если прислали recordId напрямую', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-4', email: 'user@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'user@example.com',
        phone: '+995511179241',
        altegClientIds: [123],
      }),
    });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 42, datetime: '2026-04-13T18:00:00+04:00', length: 3600, deleted: false },
    ]));

    const req = mockReq({
      headers: { authorization: 'Bearer token-101', 'content-type': 'application/json' },
      body: { action: 'cancelRecord', recordId: 999 },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Record not found');
    expect(adminMocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('cancelRecord применяет серверный дедлайн отмены', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-12T21:30:00+04:00'));

    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-5', email: 'user@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'user@example.com',
        phone: '+995511179241',
        altegClientIds: [123],
      }),
    });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 42, datetime: '2026-04-13T18:00:00+04:00', length: 3600, deleted: false },
    ]));

    const req = mockReq({
      headers: { authorization: 'Bearer token-202', 'content-type': 'application/json' },
      body: { action: 'cancelRecord', recordId: 42 },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Cancellation deadline has passed');
    expect(adminMocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('cancelRecord отменяет свою запись до дедлайна', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T10:00:00+04:00'));

    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-6', email: 'user@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'user@example.com',
        phone: '+995511179241',
        altegClientIds: [123],
      }),
    });
    adminMocks.fetch
      .mockResolvedValueOnce(successResponse([
        { id: 42, datetime: '2026-04-13T18:00:00+04:00', length: 3600, deleted: false },
      ]))
      .mockResolvedValueOnce(emptySuccessResponse());

    const req = mockReq({
      headers: { authorization: 'Bearer token-303', 'content-type': 'application/json' },
      body: { action: 'cancelRecord', recordId: 42 },
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: true } });
    expect(adminMocks.fetch).toHaveBeenCalledTimes(2);
    expect(adminMocks.fetch.mock.calls[1][0]).toContain('/record/1265772/42');
    expect(adminMocks.fetch.mock.calls[1][1].method).toBe('DELETE');
  });
});

describe('api/booking — batchBusy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    adminMocks.verifyIdToken.mockReset();
    adminMocks.userGet.mockReset();
    adminMocks.userSet.mockReset();
    adminMocks.fetch.mockReset();
    vi.stubGlobal('fetch', adminMocks.fetch);
    process.env.ALTEG_PARTNER_TOKEN = 'partner-token';
    process.env.ALTEG_USER_TOKEN = 'user-token';
    process.env.ALTEG_COMPANY_ID = '1265772';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'psych-dev-site-prod',
      client_email: 'bot@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('отклоняет GET запрос', async () => {
    const req = mockReq({ method: 'GET', query: { action: 'batchBusy' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('отклоняет пустой массив pairs', async () => {
    const req = mockReq({ body: { action: 'batchBusy', pairs: [] } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('pairs[] required');
  });

  it('отклоняет больше 30 пар', async () => {
    const pairs = Array.from({ length: 31 }, (_, i) => ({ staffId: '123', date: `2026-04-${String(i + 1).padStart(2, '0')}` }));
    const req = mockReq({ body: { action: 'batchBusy', pairs } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Max 30 pairs per request');
  });

  it('возвращает busy-блоки без clientName для анонимного запроса', async () => {
    adminMocks.fetch
      .mockResolvedValueOnce(successResponse([
        { datetime: '2026-04-13T10:00:00+04:00', length: 3600, deleted: false, client: { name: 'Иван Иванов' } },
      ]))
      .mockResolvedValueOnce(successResponse([]));

    const req = mockReq({
      body: {
        action: 'batchBusy',
        pairs: [
          { staffId: '111', date: '2026-04-13' },
          { staffId: '222', date: '2026-04-13' },
        ],
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data['111:2026-04-13']).toEqual([
      { start: '2026-04-13T10:00:00+04:00', lengthSeconds: 3600 },
    ]);
    expect(res.body.data['222:2026-04-13']).toEqual([]);
    expect(res.body.data['111:2026-04-13'][0]).not.toHaveProperty('clientName');
  });

  it('включает clientName для авторизованного запроса', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-batch', email: 'u@example.com' });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { datetime: '2026-04-13T14:00:00+04:00', length: 5400, deleted: false, client: { name: 'Мария Петрова' } },
    ]));

    const req = mockReq({
      headers: { authorization: 'Bearer token-batch', 'content-type': 'application/json' },
      body: {
        action: 'batchBusy',
        pairs: [{ staffId: '333', date: '2026-04-13' }],
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data['333:2026-04-13']).toEqual([
      { start: '2026-04-13T14:00:00+04:00', lengthSeconds: 5400, clientName: 'Мария П.' },
    ]);
  });

  it('фильтрует deleted записи', async () => {
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { datetime: '2026-04-13T10:00:00+04:00', length: 3600, deleted: false, client: { name: 'A B' } },
      { datetime: '2026-04-13T12:00:00+04:00', length: 3600, deleted: true, client: { name: 'C D' } },
    ]));

    const req = mockReq({
      body: { action: 'batchBusy', pairs: [{ staffId: '444', date: '2026-04-13' }] },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.body.data['444:2026-04-13']).toHaveLength(1);
    expect(res.body.data['444:2026-04-13'][0].start).toBe('2026-04-13T10:00:00+04:00');
  });
});

describe('api/booking — check & book', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    adminMocks.fetch.mockReset();
    vi.stubGlobal('fetch', adminMocks.fetch);
    process.env.ALTEG_PARTNER_TOKEN = 'partner-token';
    process.env.ALTEG_USER_TOKEN = 'user-token';
    process.env.ALTEG_COMPANY_ID = '1265772';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: 'psych-dev-site-prod',
      client_email: 'bot@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('check отклоняет GET запрос', async () => {
    const req = mockReq({ method: 'GET', query: { action: 'check' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('check маппит appointments в формат alteg.io', async () => {
    adminMocks.fetch.mockResolvedValueOnce(successResponse(null));

    const req = mockReq({
      body: {
        action: 'check',
        appointments: [
          { id: 1, staffId: 3012185, serviceId: 12334505, datetime: '2026-04-15T14:00:00+04:00' },
          { id: 2, staffId: 2769648, serviceId: 13451976, datetime: '2026-04-15T16:00:00+04:00' },
        ],
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const sentBody = JSON.parse(adminMocks.fetch.mock.calls[0][1].body);
    expect(sentBody.appointments).toEqual([
      { id: 1, staff_id: 3012185, services: [12334505], datetime: '2026-04-15T14:00:00+04:00' },
      { id: 2, staff_id: 2769648, services: [13451976], datetime: '2026-04-15T16:00:00+04:00' },
    ]);
    expect(adminMocks.fetch.mock.calls[0][0]).toContain('/book_check/1265772');
  });

  it('book отклоняет GET запрос', async () => {
    const req = mockReq({ method: 'GET', query: { action: 'book' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('book формирует корректный body для alteg.io', async () => {
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 1, record_id: 42, record_hash: 'abc123' },
    ]));

    const req = mockReq({
      body: {
        action: 'book',
        appointments: [
          { staffId: 3012185, serviceId: 12334505, datetime: '2026-04-15T14:00:00+04:00' },
        ],
        name: 'Иван Иванов',
        phone: '+995511179241',
        email: 'ivan@example.com',
        comment: 'Тестовая бронь',
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([{ id: 1, record_id: 42, record_hash: 'abc123' }]);

    const sentBody = JSON.parse(adminMocks.fetch.mock.calls[0][1].body);
    expect(sentBody.fullname).toBe('Иван Иванов');
    expect(sentBody.phone).toBe('+995511179241');
    expect(sentBody.email).toBe('ivan@example.com');
    expect(sentBody.comment).toBe('Тестовая бронь');
    expect(sentBody.notify_by_email).toBe(24);
    expect(sentBody.appointments).toEqual([
      { id: 1, staff_id: 3012185, services: [12334505], datetime: '2026-04-15T14:00:00+04:00' },
    ]);
    expect(adminMocks.fetch.mock.calls[0][0]).toContain('/book_record/1265772');
  });

  it('book подставляет пустые строки для необязательных полей', async () => {
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 1, record_id: 99, record_hash: 'xyz' },
    ]));

    const req = mockReq({
      body: {
        action: 'book',
        appointments: [
          { staffId: 3012126, serviceId: 13451977, datetime: '2026-04-16T10:00:00+04:00' },
        ],
        name: 'Анна',
        phone: '+79991234567',
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const sentBody = JSON.parse(adminMocks.fetch.mock.calls[0][1].body);
    expect(sentBody.email).toBe('');
    expect(sentBody.comment).toBe('');
  });

  it('book НЕ отправляет notify_by_email если у пользователя prefs.emailBookingConfirmations=false', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-optout', email: 'opt@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({
        email: 'opt@example.com',
        prefs: { emailBookingConfirmations: false },
      }),
    });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 1, record_id: 1, record_hash: 'h' },
    ]));

    const req = mockReq({
      headers: { authorization: 'Bearer token-optout', 'content-type': 'application/json' },
      body: {
        action: 'book',
        appointments: [
          { staffId: 3012185, serviceId: 12334505, datetime: '2026-04-20T14:00:00+04:00' },
        ],
        name: 'Opt Out',
        phone: '+995500000000',
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const sentBody = JSON.parse(adminMocks.fetch.mock.calls[0][1].body);
    expect(sentBody).not.toHaveProperty('notify_by_email');
  });

  it('book отправляет notify_by_email=24 для авторизованного пользователя без opt-out', async () => {
    adminMocks.verifyIdToken.mockResolvedValue({ uid: 'user-default', email: 'def@example.com' });
    adminMocks.userGet.mockResolvedValue({
      data: () => ({ email: 'def@example.com' }),
    });
    adminMocks.fetch.mockResolvedValueOnce(successResponse([
      { id: 1, record_id: 1, record_hash: 'h' },
    ]));

    const req = mockReq({
      headers: { authorization: 'Bearer token-def', 'content-type': 'application/json' },
      body: {
        action: 'book',
        appointments: [
          { staffId: 3012185, serviceId: 12334505, datetime: '2026-04-20T14:00:00+04:00' },
        ],
        name: 'Default User',
        phone: '+995500000001',
      },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const sentBody = JSON.parse(adminMocks.fetch.mock.calls[0][1].body);
    expect(sentBody.notify_by_email).toBe(24);
  });
});
