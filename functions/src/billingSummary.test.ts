import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const { mockGetBillingSummaryData } = vi.hoisted(() => ({
  mockGetBillingSummaryData: vi.fn(),
}));

vi.mock('./billingExport.js', () => ({
  getBillingSummaryData: mockGetBillingSummaryData,
}));

vi.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  return {
    onCall: (optsOrFn: unknown, fn?: Function) => (typeof optsOrFn === 'function' ? optsOrFn : fn),
    HttpsError,
  };
});

vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

// ── Import after mocks ─────────────────────────────────────────

import { getBillingSummary } from './billingSummary';

const SUPER_ADMIN_EMAIL = 'biboandbobo2@gmail.com';

function superAdminCtx() {
  return { auth: { uid: 'sa-uid', token: { email: SUPER_ADMIN_EMAIL } } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Auth checks ─────────────────────────────────────────────

describe('getBillingSummary auth checks', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect((getBillingSummary as Function)({ data: {} })).rejects.toThrow('Authentication required');
  });

  it('throws permission-denied for non-super-admin', async () => {
    await expect(
      (getBillingSummary as Function)({ data: {}, auth: { uid: 'u1', token: { email: 'user@example.com' } } }),
    ).rejects.toThrow('Only super-admin');
  });
});

// ── Behaviour ───────────────────────────────────────────────

describe('getBillingSummary', () => {
  it('passes invoiceMonth string through and returns summary data verbatim', async () => {
    const summary = { ok: true, configured: true, services: [] };
    mockGetBillingSummaryData.mockResolvedValue(summary);

    const result = await (getBillingSummary as Function)({ data: { invoiceMonth: '202607' }, ...superAdminCtx() });

    expect(mockGetBillingSummaryData).toHaveBeenCalledWith({ invoiceMonth: '202607' });
    expect(result).toBe(summary);
  });

  it('passes invoiceMonth=undefined when data is absent or not a string', async () => {
    mockGetBillingSummaryData.mockResolvedValue({ ok: true });

    await (getBillingSummary as Function)({ data: null, ...superAdminCtx() });
    expect(mockGetBillingSummaryData).toHaveBeenLastCalledWith({ invoiceMonth: undefined });

    await (getBillingSummary as Function)({ data: { invoiceMonth: 202607 }, ...superAdminCtx() });
    expect(mockGetBillingSummaryData).toHaveBeenLastCalledWith({ invoiceMonth: undefined });
  });

  it('returns ok:false payload (does not throw) when billing export fails', async () => {
    mockGetBillingSummaryData.mockRejectedValue(new Error('BigQuery quota exceeded'));

    const result = await (getBillingSummary as Function)({ data: {}, ...superAdminCtx() });

    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.error).toContain('BigQuery quota exceeded');
    expect(result.diagnostics[0]).toContain('Cloud Function getBillingSummary упала');
  });

  it('auth check fires before billing export is touched', async () => {
    await expect((getBillingSummary as Function)({ data: {} })).rejects.toThrow();
    expect(mockGetBillingSummaryData).not.toHaveBeenCalled();
  });
});
