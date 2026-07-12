import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const { mockSendTelegramMessage } = vi.hoisted(() => ({
  mockSendTelegramMessage: vi.fn(),
}));

vi.mock('./lib/telegram.js', () => ({
  sendTelegramMessage: mockSendTelegramMessage,
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
    onRequest: (optsOrFn: unknown, fn?: Function) => (typeof optsOrFn === 'function' ? optsOrFn : fn),
    HttpsError,
  };
});

vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

// ── Import after mocks ─────────────────────────────────────────

import { sendFeedback, resetFeedbackRateLimiter } from './sendFeedback';

const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };

beforeEach(() => {
  vi.clearAllMocks();
  resetFeedbackRateLimiter();
  mockSendTelegramMessage.mockResolvedValue(undefined);
});

// ── Validation ──────────────────────────────────────────────

describe('sendFeedback validation', () => {
  it('rejects unknown feedback type', async () => {
    await expect(
      (sendFeedback as Function)({ data: { type: 'rant', message: 'hello there' }, ...ctx }),
    ).rejects.toThrow('Invalid feedback type');
  });

  it('rejects missing type', async () => {
    await expect(
      (sendFeedback as Function)({ data: { message: 'hello there' }, ...ctx }),
    ).rejects.toThrow('Invalid feedback type');
  });

  it('rejects missing or too short message', async () => {
    await expect((sendFeedback as Function)({ data: { type: 'bug' }, ...ctx })).rejects.toThrow('at least 3 characters');
    await expect((sendFeedback as Function)({ data: { type: 'bug', message: ' a ' }, ...ctx })).rejects.toThrow(
      'at least 3 characters',
    );
  });

  it('rejects message longer than 2000 chars', async () => {
    await expect(
      (sendFeedback as Function)({ data: { type: 'bug', message: 'x'.repeat(2001) }, ...ctx }),
    ).rejects.toThrow('too long');
  });

  it('does not require authentication (guest feedback allowed)', async () => {
    const result = await (sendFeedback as Function)({ data: { type: 'idea', message: 'от гостя' } });
    expect(result.success).toBe(true);
  });
});

// ── Message formatting / delivery ───────────────────────────

describe('sendFeedback delivery', () => {
  it('sends telegram message with emoji, label, text and user metadata', async () => {
    const result = await (sendFeedback as Function)(
      { data: {
        type: 'bug',
        message: 'Кнопка не работает',
        userName: 'Иван',
        userEmail: 'ivan@test.com',
        userRole: 'student',
        pageUrl: 'https://academydom.com/tests',
      }, ...ctx },
    );

    expect(result).toEqual({ success: true, message: 'Спасибо за обратную связь!' });
    const sent = mockSendTelegramMessage.mock.calls[0][0] as string;
    expect(sent).toContain('🐛 *Баг*');
    expect(sent).toContain('Кнопка не работает');
    expect(sent).toContain('👤 Иван');
    expect(sent).toContain('✉️ ivan@test.com');
    expect(sent).toContain('🎭 student');
    expect(sent).toContain('🔗 https://academydom.com/tests');
    expect(sent).toContain('🕐');
  });

  it('omits metadata lines when fields are absent', async () => {
    await (sendFeedback as Function)({ data: { type: 'thanks', message: 'Спасибо большое!' }, ...ctx });

    const sent = mockSendTelegramMessage.mock.calls[0][0] as string;
    expect(sent).toContain('🙏 *Благодарность*');
    expect(sent).not.toContain('👤');
    expect(sent).not.toContain('✉️');
    expect(sent).not.toContain('🎭');
    expect(sent).not.toContain('🔗');
  });

  it('rate-limits 6th message in window per uid, other callers unaffected', async () => {
    for (let i = 0; i < 5; i++) {
      const ok = await (sendFeedback as Function)({
        data: { type: 'idea', message: `идея №${i}` },
        auth: { uid: 'spammer', token: {} },
      });
      expect(ok.success).toBe(true);
    }
    await expect(
      (sendFeedback as Function)({
        data: { type: 'idea', message: 'шестая идея' },
        auth: { uid: 'spammer', token: {} },
      }),
    ).rejects.toThrow('Слишком много сообщений');

    // другой пользователь проходит
    const other = await (sendFeedback as Function)({
      data: { type: 'idea', message: 'от другого' },
      auth: { uid: 'other-user', token: {} },
    });
    expect(other.success).toBe(true);
  });

  it('rate-limits anonymous callers by IP from rawRequest', async () => {
    for (let i = 0; i < 5; i++) {
      await (sendFeedback as Function)({
        data: { type: 'thanks', message: `спасибо №${i}` },
        rawRequest: { ip: '203.0.113.7' },
      });
    }
    await expect(
      (sendFeedback as Function)({
        data: { type: 'thanks', message: 'шестое спасибо' },
        rawRequest: { ip: '203.0.113.7' },
      }),
    ).rejects.toThrow('Слишком много сообщений');
  });

  it('wraps telegram failure into internal error', async () => {
    mockSendTelegramMessage.mockRejectedValue(new Error('chat not found'));
    await expect(
      (sendFeedback as Function)({ data: { type: 'idea', message: 'валидная идея' }, ...ctx }),
    ).rejects.toThrow('Failed to send feedback: chat not found');
  });
});
