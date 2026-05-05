import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мок firebase-admin/firestore: нам нужно подменять doc(...).get() и
// runTransaction(callback). Каждый тест ставит свои значения через
// docMap (path → snapshot).
const { mockDoc, mockRunTransaction, docMap, txCalls } = vi.hoisted(() => {
  const docMap = new Map<string, { exists: boolean; data?: Record<string, unknown> }>();
  const txCalls: Array<{ op: string; path: string; payload?: unknown }> = [];

  const buildRef = (path: string) => ({
    path,
    get: vi.fn(async () => {
      const snap = docMap.get(path) ?? { exists: false };
      return {
        exists: snap.exists,
        data: () => snap.data,
      };
    }),
  });

  const mockDoc = vi.fn((path: string) => buildRef(path));

  const mockRunTransaction = vi.fn(async (fn: (tx: any) => Promise<unknown>) => {
    const tx = {
      get: vi.fn(async (ref: { path: string }) => {
        const snap = docMap.get(ref.path) ?? { exists: false };
        return { exists: snap.exists, data: () => snap.data };
      }),
      update: vi.fn((ref: { path: string }, payload: unknown) => {
        txCalls.push({ op: 'update', path: ref.path, payload });
      }),
      set: vi.fn((ref: { path: string }, payload: unknown) => {
        txCalls.push({ op: 'set', path: ref.path, payload });
      }),
      delete: vi.fn((ref: { path: string }) => {
        txCalls.push({ op: 'delete', path: ref.path });
      }),
    };
    return fn(tx);
  });

  return { mockDoc, mockRunTransaction, docMap, txCalls };
});

vi.mock('firebase-admin/firestore', () => {
  class Timestamp {
    constructor(public _ms: number) {}
    static now() { return new Timestamp(Date.now()); }
    static fromMillis(ms: number) { return new Timestamp(ms); }
    toMillis() { return this._ms; }
  }
  return {
    getFirestore: () => ({ doc: mockDoc, runTransaction: mockRunTransaction }),
    FieldValue: { serverTimestamp: () => '__TS__' },
    Timestamp,
  };
});

vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return {
    default: { https: { onCall: (fn: Function) => fn, HttpsError } },
    https: { onCall: (fn: Function) => fn, HttpsError },
    logger: { info: vi.fn(), error: vi.fn() },
  };
});

import { bookExamSlot, cancelExamBooking } from './exams';

const EXAM_ID = 'exam-1';
const SLOT_ID = 'slot-1';
const UID = 'student-1';
const EMAIL = 'st@example.com';
const GROUP_A = 'group-a';
const GROUP_B = 'group-b';

function seedActiveExam() {
  docMap.set(`exams/${EXAM_ID}`, {
    exists: true,
    data: {
      status: 'active',
      groupIds: [GROUP_A, GROUP_B],
      essayMinChars: 100,
      essayMaxChars: 500,
      cancelLeadTimeHours: 48,
    },
  });
  docMap.set(`groups/${GROUP_A}`, { exists: true, data: { memberIds: [UID] } });
  docMap.set(`groups/${GROUP_B}`, { exists: true, data: { memberIds: ['other'] } });
  docMap.set(`users/${UID}`, { exists: true, data: { displayName: 'Test Student' } });
}

function seedSlot(bookings: Record<string, unknown> = { [GROUP_A]: null, [GROUP_B]: null }) {
  docMap.set(`exams/${EXAM_ID}/slots/${SLOT_ID}`, {
    exists: true,
    data: { startAt: { toMillis: () => Date.now() + 1000 * 60 * 60 * 72 }, bookings },
  });
}

const ctx = (uid = UID, email = EMAIL) => ({ auth: { uid, token: { email } } });

const longEssay = 'x'.repeat(150);

beforeEach(() => {
  docMap.clear();
  txCalls.length = 0;
  vi.clearAllMocks();
});

describe('bookExamSlot', () => {
  it('требует авторизации', async () => {
    await expect((bookExamSlot as Function)({}, {})).rejects.toThrow('Требуется авторизация');
  });

  it('отказ если examId/slotId пустые', async () => {
    await expect(
      (bookExamSlot as Function)({ examId: '', slotId: '', essay: longEssay }, ctx())
    ).rejects.toThrow('обязательны');
  });

  it('отказ если экзамен не найден', async () => {
    await expect(
      (bookExamSlot as Function)({ examId: 'missing', slotId: SLOT_ID, essay: longEssay }, ctx())
    ).rejects.toThrow('Экзамен не найден');
  });

  it('отказ если экзамен archived', async () => {
    seedActiveExam();
    docMap.set(`exams/${EXAM_ID}`, {
      exists: true,
      data: { ...docMap.get(`exams/${EXAM_ID}`)!.data, status: 'archived' },
    });
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: longEssay }, ctx())
    ).rejects.toThrow('архиве');
  });

  it('отказ если эссе короче min', async () => {
    seedActiveExam();
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: 'short' }, ctx())
    ).rejects.toThrow(/короче 100/);
  });

  it('отказ если эссе длиннее max', async () => {
    seedActiveExam();
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: 'x'.repeat(600) }, ctx())
    ).rejects.toThrow(/длиннее 500/);
  });

  it('отказ если юзер не в одной из групп экзамена', async () => {
    seedActiveExam();
    docMap.set(`groups/${GROUP_A}`, { exists: true, data: { memberIds: [] } });
    docMap.set(`groups/${GROUP_B}`, { exists: true, data: { memberIds: [] } });
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: longEssay }, ctx())
    ).rejects.toThrow('не состоите');
  });

  it('отказ если юзер в нескольких группах экзамена', async () => {
    seedActiveExam();
    docMap.set(`groups/${GROUP_B}`, { exists: true, data: { memberIds: [UID] } });
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: longEssay }, ctx())
    ).rejects.toThrow('нескольких группах');
  });

  it('отказ если у юзера уже есть бронь', async () => {
    seedActiveExam();
    seedSlot();
    docMap.set(`exams/${EXAM_ID}/userIndex/${UID}`, { exists: true, data: { slotId: 'other' } });
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: longEssay }, ctx())
    ).rejects.toThrow('уже есть запись');
  });

  it('отказ если место в группе уже занято', async () => {
    seedActiveExam();
    seedSlot({ [GROUP_A]: { bookedAt: 'x' }, [GROUP_B]: null });
    await expect(
      (bookExamSlot as Function)({ examId: EXAM_ID, slotId: SLOT_ID, essay: longEssay }, ctx())
    ).rejects.toThrow('уже занято');
  });

  it('happy path: пишет 4 документа в транзакции', async () => {
    seedActiveExam();
    seedSlot();
    const result = await (bookExamSlot as Function)(
      { examId: EXAM_ID, slotId: SLOT_ID, essay: longEssay },
      ctx()
    );
    expect(result).toEqual({ ok: true, slotId: SLOT_ID, groupId: GROUP_A });
    const ops = txCalls.map((c) => `${c.op}:${c.path}`);
    expect(ops).toContain(`update:exams/${EXAM_ID}/slots/${SLOT_ID}`);
    expect(ops).toContain(`set:exams/${EXAM_ID}/bookingDetails/${SLOT_ID}__${GROUP_A}`);
    expect(ops).toContain(`set:exams/${EXAM_ID}/essays/${UID}`);
    expect(ops).toContain(`set:exams/${EXAM_ID}/userIndex/${UID}`);
  });
});

describe('cancelExamBooking', () => {
  it('требует авторизации', async () => {
    await expect((cancelExamBooking as Function)({}, {})).rejects.toThrow('Требуется авторизация');
  });

  it('отказ если examId пустой', async () => {
    await expect(
      (cancelExamBooking as Function)({ examId: '' }, ctx())
    ).rejects.toThrow('examId обязателен');
  });

  it('отказ если у юзера нет брони', async () => {
    seedActiveExam();
    await expect(
      (cancelExamBooking as Function)({ examId: EXAM_ID }, ctx())
    ).rejects.toThrow('нет активной записи');
  });

  it('отказ если до экзамена меньше cancelLeadTimeHours', async () => {
    seedActiveExam();
    docMap.set(`exams/${EXAM_ID}/userIndex/${UID}`, {
      exists: true,
      data: { slotId: SLOT_ID, groupId: GROUP_A },
    });
    docMap.set(`exams/${EXAM_ID}/slots/${SLOT_ID}`, {
      exists: true,
      data: { startAt: { toMillis: () => Date.now() + 1000 * 60 * 60 } }, // 1 час
    });
    await expect(
      (cancelExamBooking as Function)({ examId: EXAM_ID }, ctx())
    ).rejects.toThrow(/Отмена возможна не позднее/);
  });

  it('happy path: удаляет 3 документа и зануляет гнездо', async () => {
    seedActiveExam();
    docMap.set(`exams/${EXAM_ID}/userIndex/${UID}`, {
      exists: true,
      data: { slotId: SLOT_ID, groupId: GROUP_A },
    });
    docMap.set(`exams/${EXAM_ID}/slots/${SLOT_ID}`, {
      exists: true,
      data: { startAt: { toMillis: () => Date.now() + 1000 * 60 * 60 * 72 } },
    });
    const result = await (cancelExamBooking as Function)({ examId: EXAM_ID }, ctx());
    expect(result).toEqual({ ok: true });
    const ops = txCalls.map((c) => `${c.op}:${c.path}`);
    expect(ops).toContain(`update:exams/${EXAM_ID}/slots/${SLOT_ID}`);
    expect(ops).toContain(`delete:exams/${EXAM_ID}/bookingDetails/${SLOT_ID}__${GROUP_A}`);
    expect(ops).toContain(`delete:exams/${EXAM_ID}/essays/${UID}`);
    expect(ops).toContain(`delete:exams/${EXAM_ID}/userIndex/${UID}`);
  });
});
