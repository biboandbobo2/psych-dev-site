import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const {
  state, verificationSet, periodRef, introRef, mockCollection,
  mockBuildVerifyResult, mockLoadActualBundle, mockExpectedFromTransformedJson,
} = vi.hoisted(() => {
  const state = { snapshot: { exists: false, data: () => ({}) } as { exists: boolean; data: () => unknown } };
  const verificationSet = vi.fn(async () => {});
  const periodRefs = new Map<string, { set: ReturnType<typeof vi.fn> }>();
  const periodRef = (id: string) => {
    if (!periodRefs.has(id)) periodRefs.set(id, { set: vi.fn(async () => {}) });
    return periodRefs.get(id)!;
  };
  const introRef = { set: vi.fn(async () => {}) };
  const mockCollection = vi.fn((name: string) => {
    if (name === 'admin') {
      return {
        doc: (id: string) =>
          id === 'expectedData'
            ? { collection: () => ({ doc: () => ({ get: async () => state.snapshot }) }) }
            : { set: verificationSet },
      };
    }
    if (name === 'periods') return { doc: periodRef };
    if (name === 'intro') return { doc: () => introRef };
    throw new Error(`unexpected collection ${name}`);
  });
  return {
    state,
    verificationSet,
    periodRef,
    introRef,
    mockCollection,
    mockBuildVerifyResult: vi.fn(),
    mockLoadActualBundle: vi.fn(),
    mockExpectedFromTransformedJson: vi.fn(),
  };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
}));

vi.mock('../../shared/verifyCore.js', () => ({
  buildVerifyResult: mockBuildVerifyResult,
  loadActualBundle: mockLoadActualBundle,
  expectedFromTransformedJson: mockExpectedFromTransformedJson,
}));

// ensureAdmin реплицирует реальное поведение (role admin|super-admin), сам helper покрыт index.test.ts
vi.mock('./index.js', () => ({
  ensureAdmin: (context: { auth?: { token?: { role?: string } } }) => {
    const role = context.auth?.token?.role;
    if (role !== 'admin' && role !== 'super-admin') {
      throw new Error('Admin only');
    }
  },
}));

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    default: { https: { onCall: (fn: Function) => fn, HttpsError }, logger },
    https: { onCall: (fn: Function) => fn, HttpsError },
    logger,
  };
});

// ── Import after mocks ─────────────────────────────────────────

import { runVerify, runReconcile } from './verify';

const EMPTY_VERIFY = {
  summaryPerPeriod: { p1: { ok: true } },
  reportMd: '# report',
  diffJson: { perPeriod: {} },
};

function adminCtx() {
  return { auth: { uid: 'admin-uid', token: { role: 'admin' } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.snapshot = { exists: false, data: () => ({}) };
  mockLoadActualBundle.mockResolvedValue({ periods: {}, intro: null });
  mockBuildVerifyResult.mockReturnValue(EMPTY_VERIFY);
  mockExpectedFromTransformedJson.mockImplementation((arr: unknown[]) => ({ periods: arr }));
});

// ── Auth ────────────────────────────────────────────────────

describe('verify auth checks', () => {
  it('runVerify rejects non-admin', async () => {
    await expect((runVerify as Function)({}, { auth: { token: { role: 'student' } } })).rejects.toThrow('Admin only');
  });

  it('runReconcile rejects non-admin', async () => {
    await expect((runReconcile as Function)({}, {})).rejects.toThrow('Admin only');
  });
});

// ── runVerify ───────────────────────────────────────────────

describe('runVerify', () => {
  it('coerces array payload via expectedFromTransformedJson', async () => {
    const arr = [{ period: 'p1' }];
    await (runVerify as Function)({ expected: arr }, adminCtx());
    expect(mockExpectedFromTransformedJson).toHaveBeenCalledWith(arr);
  });

  it('uses expected bundle with periods as-is', async () => {
    const bundle = { periods: [{ period: 'p1' }] };
    await (runVerify as Function)({ expected: bundle }, adminCtx());
    expect(mockExpectedFromTransformedJson).not.toHaveBeenCalled();
    expect(mockBuildVerifyResult).toHaveBeenCalledWith(bundle, { periods: {}, intro: null });
  });

  it('rejects payload without periods array', async () => {
    await expect((runVerify as Function)({ expected: { foo: 1 } }, adminCtx())).rejects.toThrow(
      'expected must contain periods array',
    );
  });

  it('falls back to latest snapshot and fails without one', async () => {
    await expect((runVerify as Function)({}, adminCtx())).rejects.toThrow('Upload expected snapshot first');
  });

  it('reads expected from snapshot when present', async () => {
    const bundle = { periods: [{ period: 'p1' }] };
    state.snapshot = { exists: true, data: () => bundle };

    const result = await (runVerify as Function)({}, adminCtx());

    expect(mockBuildVerifyResult).toHaveBeenCalledWith(bundle, { periods: {}, intro: null });
    expect(result.ok).toBe(true);
  });

  it('persists summary to admin/verification and returns full verify result', async () => {
    const result = await (runVerify as Function)({ expected: { periods: [] } }, adminCtx());

    expect(verificationSet).toHaveBeenCalledWith(
      { latest: { createdAt: '__SERVER_TS__', summaryPerPeriod: EMPTY_VERIFY.summaryPerPeriod } },
      { merge: true },
    );
    expect(result).toEqual({
      ok: true,
      summaryPerPeriod: EMPTY_VERIFY.summaryPerPeriod,
      reportMd: EMPTY_VERIFY.reportMd,
      diffJson: EMPTY_VERIFY.diffJson,
    });
  });
});

// ── runReconcile ────────────────────────────────────────────

describe('runReconcile', () => {
  it('requires expected payload (no snapshot fallback)', async () => {
    await expect((runReconcile as Function)({}, adminCtx())).rejects.toThrow('expected payload required');
  });

  it('plan-only mode returns plan without writing documents', async () => {
    mockBuildVerifyResult.mockReturnValue({
      summaryPerPeriod: {},
      reportMd: '',
      diffJson: {
        perPeriod: {
          p1: { missingDocument: false, scalars: { title: {} }, arrays: { concepts: { missing: ['A'] } } },
        },
      },
    });

    const result = await (runReconcile as Function)(
      { expected: { periods: [{ period: 'p1', title: 'T' }] } },
      adminCtx(),
    );

    expect(result).toEqual({
      ok: true,
      applied: false,
      plan: [{ period: 'p1', missingDocument: false, scalars: ['title'], arrays: { concepts: 1 } }],
    });
    expect(periodRef('p1').set).not.toHaveBeenCalled();
    expect(verificationSet).not.toHaveBeenCalled();
  });

  it('skips diff entries without matching expected doc', async () => {
    mockBuildVerifyResult.mockReturnValue({
      summaryPerPeriod: {},
      reportMd: '',
      diffJson: { perPeriod: { ghost: { missingDocument: true, scalars: {}, arrays: {} } } },
    });

    const result = await (runReconcile as Function)({ expected: { periods: [] } }, adminCtx());
    expect(result.plan).toEqual([]);
  });

  it('apply=true recreates missing document with merge:false', async () => {
    const expectedDoc = { period: 'p1', title: 'T' };
    mockBuildVerifyResult.mockReturnValue({
      summaryPerPeriod: {},
      reportMd: '',
      diffJson: { perPeriod: { p1: { missingDocument: true, scalars: {}, arrays: {} } } },
    });

    await (runReconcile as Function)({ apply: true, expected: { periods: [expectedDoc] } }, adminCtx());

    expect(periodRef('p1').set).toHaveBeenCalledWith(
      { ...expectedDoc, updatedAt: '__SERVER_TS__' },
      { merge: false },
    );
    expect(verificationSet).toHaveBeenCalled();
  });

  it('apply=true patches scalars and merges missing array items into current data', async () => {
    mockLoadActualBundle.mockResolvedValue({ periods: { p1: { concepts: ['Old'] } }, intro: null });
    mockBuildVerifyResult.mockReturnValue({
      summaryPerPeriod: {},
      reportMd: '',
      diffJson: {
        perPeriod: {
          p1: { missingDocument: false, scalars: { title: {} }, arrays: { concepts: { missing: ['New'] } } },
        },
      },
    });

    await (runReconcile as Function)(
      { apply: true, expected: { periods: [{ period: 'p1', title: 'T2' }] } },
      adminCtx(),
    );

    expect(periodRef('p1').set).toHaveBeenCalledWith(
      { title: 'T2', concepts: ['Old', 'New'], updatedAt: '__SERVER_TS__' },
      { merge: true },
    );
  });

  it('apply=true writes intro diff into intro/singleton', async () => {
    const introDoc = { period: 'intro', title: 'Intro' };
    mockBuildVerifyResult.mockReturnValue({
      summaryPerPeriod: {},
      reportMd: '',
      diffJson: { perPeriod: { intro: { missingDocument: true, scalars: {}, arrays: {} } } },
    });

    await (runReconcile as Function)(
      { apply: true, expected: { periods: [], intro: introDoc } },
      adminCtx(),
    );

    expect(introRef.set).toHaveBeenCalledWith({ ...introDoc, updatedAt: '__SERVER_TS__' }, { merge: false });
  });
});
