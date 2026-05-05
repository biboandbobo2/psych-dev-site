import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { deleteSlotIfEmpty, normalizeExamDoc, normalizeSlotDoc, rescheduleSlot } from '../examsFirestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    deleteDoc: vi.fn(async () => undefined),
    setDoc: vi.fn(async () => undefined),
    doc: vi.fn(() => ({} as never)),
  };
});

describe('normalizeExamDoc', () => {
  it('возвращает null если данные не объект', () => {
    expect(normalizeExamDoc('id', null)).toBeNull();
    expect(normalizeExamDoc('id', 'string')).toBeNull();
  });

  it('возвращает null если нет title/courseId/groupIds', () => {
    expect(normalizeExamDoc('id', { title: 'X' })).toBeNull();
    expect(normalizeExamDoc('id', { title: 'X', courseId: 'g' })).toBeNull();
    expect(normalizeExamDoc('id', { title: 'X', courseId: 'g', groupIds: [] })).toBeNull();
  });

  it('маппит archived статус, нормализует поля', () => {
    const doc = normalizeExamDoc('e1', {
      title: 'T',
      courseId: 'c',
      groupIds: ['g1', 'g2', 42],
      status: 'archived',
      slotDurationMinutes: 30,
      essayMinChars: 500,
    });
    expect(doc).toMatchObject({
      id: 'e1',
      title: 'T',
      courseId: 'c',
      groupIds: ['g1', 'g2'],
      status: 'archived',
      slotDurationMinutes: 30,
      essayMinChars: 500,
    });
  });

  it('подставляет дефолты при отсутствии полей', () => {
    const doc = normalizeExamDoc('e1', { title: 'T', courseId: 'c', groupIds: ['g1'] });
    expect(doc?.slotDurationMinutes).toBe(40);
    expect(doc?.essayMinChars).toBe(1000);
    expect(doc?.essayMaxChars).toBe(3500);
    expect(doc?.cancelLeadTimeHours).toBe(48);
    expect(doc?.timezone).toBe('Asia/Tbilisi');
    expect(doc?.status).toBe('active');
  });
});

describe('normalizeSlotDoc', () => {
  it('возвращает null без startAt/endAt', () => {
    expect(normalizeSlotDoc('s', {})).toBeNull();
  });

  it('маппит bookings: { groupId: { bookedAt }} и null', () => {
    const ts = Timestamp.fromMillis(1_000);
    const slot = normalizeSlotDoc('s', {
      startAt: ts,
      endAt: ts,
      bookings: {
        g1: { bookedAt: ts },
        g2: null,
        g3: 'garbage', // должно нормализоваться в null
      },
    });
    expect(slot?.bookings).toEqual({
      g1: { bookedAt: ts },
      g2: null,
      g3: null,
    });
  });
});

describe('deleteSlotIfEmpty', () => {
  it('кидает ошибку, если есть бронь', async () => {
    const slot = {
      id: 's',
      bookings: { g1: { bookedAt: Timestamp.now() }, g2: null },
    };
    await expect(deleteSlotIfEmpty('e', slot as never)).rejects.toThrow('бронью');
  });

  it('пропускает удаление пустого слота', async () => {
    const slot = { id: 's', bookings: { g1: null, g2: null } };
    await expect(deleteSlotIfEmpty('e', slot as never)).resolves.toBeUndefined();
  });
});

describe('rescheduleSlot', () => {
  it('кидает ошибку при бронях', async () => {
    const slot = { id: 's', bookings: { g1: { bookedAt: Timestamp.now() } } };
    await expect(
      rescheduleSlot('e', slot as never, new Date(), 40)
    ).rejects.toThrow('бронью');
  });

  beforeEach(() => vi.clearAllMocks());
});
