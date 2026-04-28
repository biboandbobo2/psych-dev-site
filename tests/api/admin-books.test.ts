import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminMocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  collection: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [],
  cert: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: adminMocks.verifyIdToken,
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: adminMocks.collection,
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-04-28T00:00:00Z') }),
  },
  FieldValue: {},
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({ file: () => ({ exists: async () => [false] }) }),
  }),
}));

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn(),
}));

vi.mock('../../src/lib/api-server/sharedApiRuntime.js', () => ({
  initFirebaseAdmin: vi.fn(),
  setSharedCorsHeaders: vi.fn(),
}));

import handler from '../../api/admin/books.js';

const mockReq = (overrides: { method?: string; query?: Record<string, string>; body?: unknown; headers?: Record<string, string> } = {}) =>
  ({
    method: overrides.method ?? 'POST',
    headers: overrides.headers ?? {},
    query: overrides.query ?? {},
    body: overrides.body,
  }) as never;

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(key: string, value: string) {
      res.headers[key] = value;
      return res;
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

function asAdmin(uid = 'admin-uid', email = 'admin@example.com') {
  adminMocks.verifyIdToken.mockResolvedValueOnce({ uid, email, role: 'admin' });
}

function asSuperAdmin(uid = 'super-uid') {
  adminMocks.verifyIdToken.mockResolvedValueOnce({
    uid,
    email: 'biboandbobo2@gmail.com',
    role: 'super-admin',
  });
}

function asStudent(uid = 'student-uid') {
  adminMocks.verifyIdToken.mockResolvedValueOnce({
    uid,
    email: 'student@example.com',
    role: undefined,
  });
}

beforeEach(() => {
  adminMocks.verifyIdToken.mockReset();
  adminMocks.collection.mockReset();
});

describe('api/admin/books — CORS / method routing', () => {
  it('OPTIONS returns 204', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'OPTIONS' }), res as never);
    expect(res.statusCode).toBe(204);
  });

  it('PUT returns 405 for non-list action', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({ method: 'PUT', headers: { authorization: 'Bearer t' }, query: { action: 'create' } }),
      res as never,
    );
    expect(res.statusCode).toBe(405);
  });
});

describe('api/admin/books — auth', () => {
  it('GET без Bearer → 401 UNAUTHORIZED', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'GET', query: { action: 'list' } }), res as never);
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toBe('Missing authorization');
  });

  it('GET с невалидным токеном → 401', async () => {
    adminMocks.verifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const res = mockRes();
    await handler(
      mockReq({ method: 'GET', headers: { authorization: 'Bearer bad' }, query: { action: 'list' } }),
      res as never,
    );
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: string }).error).toBe('Invalid token');
  });

  it('GET со студентом (без admin role) → 403 FORBIDDEN', async () => {
    asStudent();
    const res = mockRes();
    await handler(
      mockReq({ method: 'GET', headers: { authorization: 'Bearer t' }, query: { action: 'list' } }),
      res as never,
    );
    expect(res.statusCode).toBe(403);
    expect((res.body as { error: string }).error).toBe('Insufficient permissions');
  });

  it('super-admin email пропускается без role claim', async () => {
    adminMocks.verifyIdToken.mockResolvedValueOnce({
      uid: 'u',
      email: 'biboandbobo2@gmail.com',
      role: undefined,
    });
    adminMocks.collection.mockReturnValueOnce({
      orderBy: () => ({ get: async () => ({ docs: [] }) }),
    });
    const res = mockRes();
    await handler(
      mockReq({ method: 'GET', headers: { authorization: 'Bearer t' }, query: { action: 'list' } }),
      res as never,
    );
    expect(res.statusCode).toBe(200);
  });
});

describe('api/admin/books — GET list', () => {
  it('возвращает 400 при неизвестном GET action', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'GET',
        headers: { authorization: 'Bearer t' },
        query: { action: 'unknownGet' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('list мапит документы в публичную форму', async () => {
    asAdmin();
    adminMocks.collection.mockReturnValueOnce({
      orderBy: () => ({
        get: async () => ({
          docs: [
            {
              id: 'b1',
              data: () => ({
                title: 'Книга 1',
                authors: ['Автор'],
                language: 'ru',
                year: 2024,
                tags: ['psy'],
                status: 'ready',
                active: true,
                chunksCount: 100,
              }),
            },
          ],
        }),
      }),
    });

    const res = mockRes();
    await handler(
      mockReq({ method: 'GET', headers: { authorization: 'Bearer t' }, query: { action: 'list' } }),
      res as never,
    );

    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; books: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.books).toHaveLength(1);
    expect(body.books[0]).toMatchObject({
      id: 'b1',
      title: 'Книга 1',
      authors: ['Автор'],
      year: 2024,
      status: 'ready',
      active: true,
    });
  });
});

describe('api/admin/books — GET jobStatus', () => {
  it('возвращает 400 без jobId', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'GET',
        headers: { authorization: 'Bearer t' },
        query: { action: 'jobStatus' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('возвращает 404 если job не найден', async () => {
    asAdmin();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'GET',
        headers: { authorization: 'Bearer t' },
        query: { action: 'jobStatus', jobId: 'missing' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(404);
  });

  it('считает progressPercent из progress.done/total', async () => {
    asAdmin();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({
        get: async () => ({
          exists: true,
          id: 'job-1',
          data: () => ({
            bookId: 'b1',
            status: 'running',
            step: 'embed',
            progress: { done: 50, total: 200 },
            startedAt: { toDate: () => new Date('2026-04-28T00:00:00Z') },
            finishedAt: null,
            logs: [],
            error: null,
          }),
        }),
      }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'GET',
        headers: { authorization: 'Bearer t' },
        query: { action: 'jobStatus', jobId: 'job-1' },
      }),
      res as never,
    );

    expect(res.statusCode).toBe(200);
    const body = res.body as { job: { progressPercent: number; stepLabel: string } };
    expect(body.job.progressPercent).toBe(25);
    expect(body.job.stepLabel).toBe('Создание эмбеддингов');
  });
});

describe('api/admin/books — POST create', () => {
  it('возвращает 400 без title', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'create', authors: ['Автор'] },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toContain('Title');
  });

  it('возвращает 400 без authors', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'create', title: 'T' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('создаёт book doc с правильными полями и возвращает bookId', async () => {
    asAdmin();
    const setSpy = vi.fn();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({ id: 'new-id', set: setSpy }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: {
          action: 'create',
          title: '  Книга  ',
          authors: ['Фрейд'],
          language: 'ru',
          year: 1900,
          tags: ['psy'],
        },
      }),
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect((res.body as { bookId: string }).bookId).toBe('new-id');
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Книга',
        authors: ['Фрейд'],
        status: 'draft',
        active: false,
      }),
    );
  });
});

describe('api/admin/books — POST update validation', () => {
  it('игнорирует year вне диапазона 1800..currentYear+1', async () => {
    asAdmin();
    const updateSpy = vi.fn();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({ active: false }) }),
        update: updateSpy,
      }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'update', bookId: 'b1', year: 1500 },
      }),
      res as never,
    );

    expect(res.statusCode).toBe(200);
    const callArg = updateSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg.year).toBeUndefined();
    expect(callArg.updatedAt).toBeDefined();
  });

  it('игнорирует language не из whitelist', async () => {
    asAdmin();
    const updateSpy = vi.fn();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({}) }),
        update: updateSpy,
      }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'update', bookId: 'b1', language: 'jp' },
      }),
      res as never,
    );

    const callArg = updateSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg.language).toBeUndefined();
  });
});

describe('api/admin/books — POST uploadUrl', () => {
  it('400 если contentType не application/pdf', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'uploadUrl', bookId: 'b1', contentType: 'image/png', fileSize: 100 },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('400 если fileSize > 100MB', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: {
          action: 'uploadUrl',
          bookId: 'b1',
          contentType: 'application/pdf',
          fileSize: 200 * 1024 * 1024,
        },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('api/admin/books — POST manage', () => {
  it('400 без bookId', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'manage', subAction: 'toggleActive' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });

  it('404 если книга не найдена', async () => {
    asAdmin();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({ get: async () => ({ exists: false }) }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'manage', subAction: 'toggleActive', bookId: 'missing' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(404);
  });

  it('toggleActive переключает active на противоположное и возвращает новое значение', async () => {
    asAdmin();
    const updateSpy = vi.fn();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({ active: false }) }),
        update: updateSpy,
      }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'manage', subAction: 'toggleActive', bookId: 'b1' },
      }),
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect((res.body as { active: boolean }).active).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
    );
  });

  it('400 при неизвестном subAction', async () => {
    asAdmin();
    adminMocks.collection.mockReturnValueOnce({
      doc: () => ({ get: async () => ({ exists: true, data: () => ({}) }) }),
    });

    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'manage', subAction: 'reanimate', bookId: 'b1' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('api/admin/books — invalid action', () => {
  it('возвращает 400 на неизвестный POST action', async () => {
    asAdmin();
    const res = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer t' },
        body: { action: 'launchRockets' },
      }),
      res as never,
    );
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toBe('Invalid action');
  });
});

describe('api/admin/books — super-admin via role claim', () => {
  it('допускает super-admin без email match', async () => {
    asSuperAdmin();
    adminMocks.collection.mockReturnValueOnce({
      orderBy: () => ({ get: async () => ({ docs: [] }) }),
    });

    const res = mockRes();
    await handler(
      mockReq({ method: 'GET', headers: { authorization: 'Bearer t' }, query: { action: 'list' } }),
      res as never,
    );
    expect(res.statusCode).toBe(200);
  });
});
