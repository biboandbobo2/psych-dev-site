import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/firebase', () => ({
  auth: { currentUser: null as null | { getIdToken: () => Promise<string> } },
  db: {},
}));

import { auth } from '../../../lib/firebase';
import { generateCourseIntroDraft } from './api';

const setCurrentUser = (user: null | { getIdToken: () => Promise<string> }) => {
  (auth as { currentUser: typeof user }).currentUser = user;
};

describe('generateCourseIntroDraft', () => {
  beforeEach(() => {
    setCurrentUser({ getIdToken: () => Promise.resolve('fake-id-token') });
    global.fetch = vi.fn() as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setCurrentUser(null);
  });

  it('бросает ошибку, если geminiKey не передан', async () => {
    await expect(generateCourseIntroDraft('X', [], 'idea', null)).rejects.toThrow(
      /Gemini API ключ/,
    );
  });

  it('бросает ошибку, если currentUser отсутствует', async () => {
    setCurrentUser(null);
    await expect(generateCourseIntroDraft('X', [], 'idea', 'key')).rejects.toThrow(
      /Войдите в аккаунт/,
    );
  });

  it('передаёт нужные headers и body, возвращает answer при ok=true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, answer: 'Черновик' }),
    });
    global.fetch = mockFetch as never;

    const result = await generateCourseIntroDraft(
      'Курс по психологии',
      ['Лекция 1', 'Лекция 2'],
      'program',
      'gemini-key',
    );

    expect(result).toBe('Черновик');
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/assistant');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer fake-id-token');
    expect(headers['X-Gemini-Api-Key']).toBe('gemini-key');
    expect(JSON.parse(init.body as string)).toEqual({
      action: 'courseIntroDraft',
      courseName: 'Курс по психологии',
      lessons: ['Лекция 1', 'Лекция 2'],
      kind: 'program',
    });
  });

  it('бросает ошибку при !response.ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ ok: false, error: 'BYOK_REQUIRED' }),
    }) as never;

    await expect(generateCourseIntroDraft('X', [], 'idea', 'key')).rejects.toThrow(/BYOK_REQUIRED/);
  });

  it('бросает HTTP fallback если error не передан', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false }),
    }) as never;

    await expect(generateCourseIntroDraft('X', [], 'idea', 'key')).rejects.toThrow(/HTTP 500/);
  });

  it('возвращает пустую строку если answer не string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, answer: 42 }),
    }) as never;

    expect(await generateCourseIntroDraft('X', [], 'idea', 'key')).toBe('');
  });
});
