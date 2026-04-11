import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock firebase-admin before importing handler
const adminMocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createCustomToken: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
  cert: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUserByEmail: adminMocks.getUserByEmail,
    createCustomToken: adminMocks.createCustomToken,
  }),
}));

import handler from '../../api/auth.js';

const mockReq = (options: { method?: string; query?: Record<string, string>; body?: unknown } = {}) =>
  ({
    method: options.method ?? 'POST',
    headers: { 'content-type': 'application/json' },
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

describe('api/auth — loginByEmail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminMocks.getUserByEmail.mockReset();
    adminMocks.createCustomToken.mockReset();
  });

  it('возвращает 405 для GET запроса', async () => {
    const req = mockReq({ method: 'GET', query: { action: 'loginByEmail' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.success).toBe(false);
  });

  it('возвращает 400 если email не передан', async () => {
    const req = mockReq({ query: { action: 'loginByEmail' }, body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('email required');
  });

  it('возвращает token для верифицированного пользователя', async () => {
    adminMocks.getUserByEmail.mockResolvedValue({
      uid: 'user-123',
      emailVerified: true,
    });
    adminMocks.createCustomToken.mockResolvedValue('custom-token-abc');

    const req = mockReq({
      query: { action: 'loginByEmail' },
      body: { email: 'test@example.com' },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('custom-token-abc');
    expect(adminMocks.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    expect(adminMocks.createCustomToken).toHaveBeenCalledWith('user-123');
  });

  it('возвращает 404 для несуществующего email', async () => {
    const err = new Error('user not found');
    (err as any).code = 'auth/user-not-found';
    adminMocks.getUserByEmail.mockRejectedValue(err);

    const req = mockReq({
      query: { action: 'loginByEmail' },
      body: { email: 'nobody@example.com' },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  it('возвращает 403 для неверифицированного email', async () => {
    adminMocks.getUserByEmail.mockResolvedValue({
      uid: 'user-456',
      emailVerified: false,
    });

    const req = mockReq({
      query: { action: 'loginByEmail' },
      body: { email: 'unverified@example.com' },
    });
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('EMAIL_NOT_VERIFIED');
    expect(adminMocks.createCustomToken).not.toHaveBeenCalled();
  });
});
