import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  whereSpy: vi.fn(),
  collectionGroupSpy: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [],
  cert: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collectionGroup: (...args: unknown[]) => {
      firestoreMocks.collectionGroupSpy(...args);
      return {
        where: (...whereArgs: unknown[]) => {
          firestoreMocks.whereSpy(...whereArgs);
          return { get: firestoreMocks.getMock };
        },
      };
    },
  }),
}));

vi.mock('../../src/lib/api-server/sharedApiRuntime.js', () => ({
  initFirebaseAdmin: vi.fn(),
}));

import handler from '../../api/transcript-search.js';

const mockReq = (overrides: { method?: string; query?: Record<string, string>; headers?: Record<string, string> } = {}) =>
  ({
    method: overrides.method ?? 'GET',
    headers: overrides.headers ?? {},
    query: overrides.query ?? {},
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

function makeChunkSnap(overrides: Partial<{ normalizedText: string; text: string; startMs: number; endMs: number }>) {
  const data = {
    youtubeVideoId: 'vid',
    referenceKey: 'dev::lesson::0',
    courseId: 'development',
    periodId: 'lesson',
    periodTitle: 'Период',
    lectureTitle: 'Лекция',
    sourcePath: 'p',
    sourceUrl: 'https://example.com',
    chunkIndex: 0,
    startMs: overrides.startMs ?? 0,
    endMs: overrides.endMs ?? 1000,
    timestampLabel: '00:00',
    segmentCount: 1,
    text: overrides.text ?? 'Текст чанка',
    normalizedText: overrides.normalizedText ?? 'текст чанка',
    searchTokens: [],
    updatedAt: { seconds: 1 },
    version: 1,
  };
  return { data: () => data };
}

beforeEach(() => {
  firestoreMocks.whereSpy.mockReset();
  firestoreMocks.collectionGroupSpy.mockReset();
  firestoreMocks.getMock.mockReset();
});

describe('api/transcript-search — array-contains-any indexing', () => {
  it('returns empty for empty query without touching Firestore', async () => {
    const res = mockRes();
    await handler(mockReq({ query: { q: '' } }), res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, chunks: [] });
    expect(firestoreMocks.collectionGroupSpy).not.toHaveBeenCalled();
  });

  it('builds array-contains-any query with normalized tokens', async () => {
    firestoreMocks.getMock.mockResolvedValue({ docs: [] });
    const res = mockRes();
    await handler(mockReq({ query: { q: 'Психология фрейда' } }), res as never);

    expect(firestoreMocks.collectionGroupSpy).toHaveBeenCalledWith('searchChunks');
    expect(firestoreMocks.whereSpy).toHaveBeenCalledWith(
      'searchTokens',
      'array-contains-any',
      ['психология', 'фрейда'],
    );
  });

  it('caps query tokens to 30 (Firestore limit)', async () => {
    firestoreMocks.getMock.mockResolvedValue({ docs: [] });
    const longQuery = Array.from({ length: 35 }, (_, i) => `слово${i}`).join(' ');
    const res = mockRes();
    await handler(mockReq({ query: { q: longQuery } }), res as never);

    const call = firestoreMocks.whereSpy.mock.calls[0];
    expect(call[2]).toHaveLength(30);
  });

  it('drops stop-words and tokens shorter than 3 chars from query', async () => {
    firestoreMocks.getMock.mockResolvedValue({ docs: [] });
    const res = mockRes();
    await handler(mockReq({ query: { q: 'и в на ум юнг' } }), res as never);

    expect(firestoreMocks.whereSpy).toHaveBeenCalledWith(
      'searchTokens',
      'array-contains-any',
      ['юнг'],
    );
  });

  it('filters candidates so all query words must be present (AND semantics)', async () => {
    firestoreMocks.getMock.mockResolvedValue({
      docs: [
        // matches: содержит оба слова
        makeChunkSnap({ normalizedText: 'фрейд писал о психоанализе и снах', startMs: 100 }),
        // не matches: только одно слово
        makeChunkSnap({ normalizedText: 'фрейд писал статью', startMs: 200 }),
      ],
    });

    const res = mockRes();
    await handler(mockReq({ query: { q: 'фрейд психоанализ' } }), res as never);

    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; chunks: { startMs: number }[] };
    expect(body.ok).toBe(true);
    expect(body.chunks).toHaveLength(1);
    expect(body.chunks[0].startMs).toBe(100);
  });

  it('sorts results by score (count of matches), tie-break by startMs', async () => {
    firestoreMocks.getMock.mockResolvedValue({
      docs: [
        // 1 match
        makeChunkSnap({ normalizedText: 'фрейд писал', startMs: 100 }),
        // 3 matches — should win
        makeChunkSnap({ normalizedText: 'фрейд фрейд фрейд', startMs: 200 }),
        // 1 match, но раньше по startMs чем первый — должен быть выше
        makeChunkSnap({ normalizedText: 'статья про фрейд', startMs: 50 }),
      ],
    });

    const res = mockRes();
    await handler(mockReq({ query: { q: 'фрейд' } }), res as never);

    const body = res.body as { chunks: { startMs: number }[] };
    expect(body.chunks.map((c) => c.startMs)).toEqual([200, 50, 100]);
  });
});
