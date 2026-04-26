import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSet, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockDocRef = { set: mockSet };
  const mockDoc = vi.fn(() => mockDocRef);
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  return { mockSet, mockDoc, mockCollection };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
}));

vi.mock('firebase-admin/app', () => ({
  getApps: () => [],
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  }
  return {
    default: {
      https: { onCall: (fn: Function) => fn, HttpsError },
      logger: { info: vi.fn(), error: vi.fn() },
    },
    https: { onCall: (fn: Function) => fn, HttpsError },
    logger: { info: vi.fn(), error: vi.fn() },
  };
});

import { updateMyEmailPreferences } from './userPreferences';

function authedCtx(uid = 'user-1') {
  return { auth: { uid, token: { email: 'u@example.com' } } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateMyEmailPreferences', () => {
  it('throws unauthenticated when no auth', async () => {
    await expect(
      (updateMyEmailPreferences as Function)({ emailBookingConfirmations: false }, {}),
    ).rejects.toThrow('Authentication required');
  });

  it('throws invalid-argument when emailBookingConfirmations missing', async () => {
    await expect(
      (updateMyEmailPreferences as Function)({}, authedCtx()),
    ).rejects.toThrow('emailBookingConfirmations must be boolean');
  });

  it('throws invalid-argument when value is not boolean', async () => {
    await expect(
      (updateMyEmailPreferences as Function)(
        { emailBookingConfirmations: 'no' },
        authedCtx(),
      ),
    ).rejects.toThrow('must be boolean');
  });

  it('saves opt-out (false) for current user', async () => {
    mockSet.mockResolvedValue(undefined);

    const result = await (updateMyEmailPreferences as Function)(
      { emailBookingConfirmations: false },
      authedCtx('user-42'),
    );

    expect(result).toEqual({
      success: true,
      prefs: { emailBookingConfirmations: false },
    });
    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('user-42');
    expect(mockSet).toHaveBeenCalledOnce();
    const [payload, options] = mockSet.mock.calls[0];
    expect(payload.prefs).toEqual({ emailBookingConfirmations: false });
    expect(payload.prefsUpdatedAt).toBe('__SERVER_TS__');
    expect(options).toEqual({ merge: true });
  });

  it('saves opt-in (true) for current user', async () => {
    mockSet.mockResolvedValue(undefined);

    const result = await (updateMyEmailPreferences as Function)(
      { emailBookingConfirmations: true },
      authedCtx('user-7'),
    );

    expect(result.prefs.emailBookingConfirmations).toBe(true);
    expect(mockSet.mock.calls[0][0].prefs.emailBookingConfirmations).toBe(true);
  });
});
