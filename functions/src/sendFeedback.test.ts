import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const { mockSendTelegramMessage } = vi.hoisted(() => ({
  mockSendTelegramMessage: vi.fn(),
}));

vi.mock('./lib/telegram.js', () => ({
  sendTelegramMessage: mockSendTelegramMessage,
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

import { sendFeedback } from './sendFeedback';

const ctx = { auth: { uid: 'u1', token: { email: 'u1@example.com' } } };

beforeEach(() => {
  vi.clearAllMocks();
  mockSendTelegramMessage.mockResolvedValue(undefined);
});

// ── Validation ──────────────────────────────────────────────

describe('sendFeedback validation', () => {
  it('rejects unknown feedback type', async () => {
    await expect(
      (sendFeedback as Function)({ type: 'rant', message: 'hello there' }, ctx),
    ).rejects.toThrow('Invalid feedback type');
  });

  it('rejects missing type', async () => {
    await expect(
      (sendFeedback as Function)({ message: 'hello there' }, ctx),
    ).rejects.toThrow('Invalid feedback type');
  });

  it('rejects missing or too short message', async () => {
    await expect((sendFeedback as Function)({ type: 'bug' }, ctx)).rejects.toThrow('at least 3 characters');
    await expect((sendFeedback as Function)({ type: 'bug', message: ' a ' }, ctx)).rejects.toThrow(
      'at least 3 characters',
    );
  });

  it('rejects message longer than 2000 chars', async () => {
    await expect(
      (sendFeedback as Function)({ type: 'bug', message: 'x'.repeat(2001) }, ctx),
    ).rejects.toThrow('too long');
  });

  it('does not require authentication (guest feedback allowed)', async () => {
    const result = await (sendFeedback as Function)({ type: 'idea', message: 'от гостя' }, {});
    expect(result.success).toBe(true);
  });
});

// ── Message formatting / delivery ───────────────────────────

describe('sendFeedback delivery', () => {
  it('sends telegram message with emoji, label, text and user metadata', async () => {
    const result = await (sendFeedback as Function)(
      {
        type: 'bug',
        message: 'Кнопка не работает',
        userName: 'Иван',
        userEmail: 'ivan@test.com',
        userRole: 'student',
        pageUrl: 'https://academydom.com/tests',
      },
      ctx,
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
    await (sendFeedback as Function)({ type: 'thanks', message: 'Спасибо большое!' }, ctx);

    const sent = mockSendTelegramMessage.mock.calls[0][0] as string;
    expect(sent).toContain('🙏 *Благодарность*');
    expect(sent).not.toContain('👤');
    expect(sent).not.toContain('✉️');
    expect(sent).not.toContain('🎭');
    expect(sent).not.toContain('🔗');
  });

  it('wraps telegram failure into internal error', async () => {
    mockSendTelegramMessage.mockRejectedValue(new Error('chat not found'));
    await expect(
      (sendFeedback as Function)({ type: 'idea', message: 'валидная идея' }, ctx),
    ).rejects.toThrow('Failed to send feedback: chat not found');
  });
});
