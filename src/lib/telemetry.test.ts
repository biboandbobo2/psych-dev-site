import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { addDoc } from 'firebase/firestore';

// jsdom не реализует SubtleCrypto — подставляем webcrypto из Node
if (!globalThis.crypto?.subtle) {
  try {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      configurable: true,
      value: webcrypto.subtle,
    });
  } catch {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
  }
}

const authState = vi.hoisted(() => ({ currentUser: null as { uid: string } | null }));

vi.mock('./firebase', () => ({
  auth: authState,
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-ts'),
}));

const addDocMock = vi.mocked(addDoc);

async function loadTelemetry() {
  return await import('./telemetry');
}

async function sha256Hex16(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

describe('trackFeatureEvent', () => {
  beforeEach(() => {
    vi.resetModules();
    addDocMock.mockReset();
    addDocMock.mockResolvedValue({} as never);
    authState.currentUser = { uid: 'user-123' };
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('пишет событие с усечённым SHA-256 вместо uid', async () => {
    const { trackFeatureEvent } = await loadTelemetry();
    trackFeatureEvent('research_search');

    await vi.waitFor(() => expect(addDocMock).toHaveBeenCalledTimes(1));
    const payload = addDocMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.event).toBe('research_search');
    expect(payload.hashedUid).toBe(await sha256Hex16('user-123'));
    expect(payload.hashedUid).not.toContain('user-123');
    expect(payload.platform).toBe('desktop');
    expect(payload.createdAt).toBe('server-ts');
    expect(payload).not.toHaveProperty('courseId');
    expect(payload).not.toHaveProperty('periodId');
  });

  it('добавляет courseId/periodId из meta', async () => {
    const { trackFeatureEvent } = await loadTelemetry();
    trackFeatureEvent('study_mode_opened', { courseId: 'development', periodId: 'infancy' });

    await vi.waitFor(() => expect(addDocMock).toHaveBeenCalledTimes(1));
    const payload = addDocMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.courseId).toBe('development');
    expect(payload.periodId).toBe('infancy');
  });

  it('дедупит повтор события с теми же meta в рамках сессии', async () => {
    const { trackFeatureEvent } = await loadTelemetry();
    trackFeatureEvent('research_search');
    trackFeatureEvent('research_search');

    await vi.waitFor(() => expect(addDocMock).toHaveBeenCalledTimes(1));
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });

  it('одно событие с разными meta — две записи', async () => {
    const { trackFeatureEvent } = await loadTelemetry();
    trackFeatureEvent('study_mode_opened', { courseId: 'a', periodId: 'p1' });
    trackFeatureEvent('study_mode_opened', { courseId: 'a', periodId: 'p2' });

    await vi.waitFor(() => expect(addDocMock).toHaveBeenCalledTimes(2));
  });

  it('гость (нет currentUser) — ничего не пишет', async () => {
    authState.currentUser = null;
    const { trackFeatureEvent } = await loadTelemetry();
    trackFeatureEvent('research_search');

    await Promise.resolve();
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('вне прода (PROD=false) — ничего не пишет', async () => {
    vi.stubEnv('PROD', false);
    const { trackFeatureEvent } = await loadTelemetry();
    trackFeatureEvent('research_search');

    await Promise.resolve();
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('ошибка записи не выбрасывается наружу и освобождает дедуп-ключ', async () => {
    addDocMock.mockRejectedValueOnce(new Error('network down'));
    const { trackFeatureEvent } = await loadTelemetry();

    expect(() => trackFeatureEvent('research_search')).not.toThrow();
    await vi.waitFor(() => expect(addDocMock).toHaveBeenCalledTimes(1));

    // после ошибки повтор снова разрешён
    trackFeatureEvent('research_search');
    await vi.waitFor(() => expect(addDocMock).toHaveBeenCalledTimes(2));
  });
});
