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
