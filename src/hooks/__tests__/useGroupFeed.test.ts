import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  updateGroupAnnouncement,
  updateGroupEvent,
} from '../useGroupFeed';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  Timestamp: {
    fromMillis: vi.fn((ms: number) => ({ __ts: ms })),
  },
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

describe('updateGroupEvent — wave 5.1', () => {
  const updateDocMock = vi.mocked(updateDoc);
  const docMock = vi.mocked(doc);
  const tsMock = vi.mocked(Timestamp.fromMillis);

  beforeEach(() => {
    updateDocMock.mockReset();
    docMock.mockClear();
    tsMock.mockClear();
  });

  it('всегда ставит lastWriteSource=firestore при изменении text', async () => {
    await updateGroupEvent('g1', 'evt-1', { text: 'Новый текст события' });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        text: 'Новый текст события',
        lastWriteSource: 'firestore',
      })
    );
  });

  it('пересчитывает dateLabel и пишет startAt/endAt при изменении времени', async () => {
    const startMs = Date.UTC(2026, 4, 15, 9, 0);
    const endMs = startMs + 60 * 60 * 1000;

    await updateGroupEvent('g1', 'evt-1', {
      startAtMs: startMs,
      endAtMs: endMs,
      isAllDay: false,
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload).toHaveProperty('startAt');
    expect(payload).toHaveProperty('endAt');
    expect(payload.isAllDay).toBe(false);
    expect(typeof payload.dateLabel).toBe('string');
    expect((payload.dateLabel as string).length).toBeGreaterThan(0);
    expect(payload.lastWriteSource).toBe('firestore');
  });

  it('бросает ошибку если endAt <= startAt', async () => {
    const startMs = Date.UTC(2026, 4, 15, 10, 0);
    await expect(
      updateGroupEvent('g1', 'evt-1', {
        startAtMs: startMs,
        endAtMs: startMs,
      })
    ).rejects.toThrow(/окончания/i);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('преобразует пустую zoomLink/siteLink/longText в null', async () => {
    await updateGroupEvent('g1', 'evt-1', {
      zoomLink: '   ',
      siteLink: '',
      longText: '   ',
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload.zoomLink).toBeNull();
    expect(payload.siteLink).toBeNull();
    expect(payload.longText).toBeNull();
    expect(payload.lastWriteSource).toBe('firestore');
  });

  it('обновляет dueDate для assignment и валидирует формат', async () => {
    await updateGroupEvent('g1', 'evt-1', { dueDate: '2026-05-15' });
    expect(updateDocMock).toHaveBeenCalledTimes(1);

    updateDocMock.mockClear();
    await expect(
      updateGroupEvent('g1', 'evt-1', { dueDate: '15.05.2026' })
    ).rejects.toThrow(/YYYY-MM-DD/);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('бросает ошибку если text слишком короткий', async () => {
    await expect(
      updateGroupEvent('g1', 'evt-1', { text: 'A' })
    ).rejects.toThrow(/3 символа/);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('не вызывает updateDoc, если patch пустой', async () => {
    await updateGroupEvent('g1', 'evt-1', {});
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe('updateGroupAnnouncement — wave 5.1', () => {
  const updateDocMock = vi.mocked(updateDoc);

  beforeEach(() => {
    updateDocMock.mockReset();
  });

  it('обновляет text как строкой (legacy сигнатура)', async () => {
    await updateGroupAnnouncement('g1', 'ann-1', 'Новый текст объявления');
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ text: 'Новый текст объявления' });
  });

  it('обновляет text + newsType через объект', async () => {
    await updateGroupAnnouncement('g1', 'ann-1', {
      text: 'Новый текст',
      newsType: 'content',
    });
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ text: 'Новый текст', newsType: 'content' });
  });

  it('сбрасывает newsType когда передан null', async () => {
    await updateGroupAnnouncement('g1', 'ann-1', { text: 'X X X', newsType: null });
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload.newsType).toBeNull();
  });

  it('бросает ошибку если text слишком короткий', async () => {
    await expect(
      updateGroupAnnouncement('g1', 'ann-1', { text: 'A' })
    ).rejects.toThrow(/3 символа/);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('не вызывает updateDoc для пустого patch', async () => {
    await updateGroupAnnouncement('g1', 'ann-1', {});
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
