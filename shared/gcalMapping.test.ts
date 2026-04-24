import { describe, it, expect } from 'vitest';
import {
  extractZoomLink,
  formatDateLabel,
  gcalEventToFirestore,
  firestoreEventToGCal,
  resolveLWW,
} from './gcalMapping';

const TZ = 'Asia/Tbilisi';

describe('extractZoomLink', () => {
  it('finds zoom url inside description text', () => {
    expect(
      extractZoomLink(null, 'Встречаемся здесь https://zoom.us/j/12345?pwd=abc — до связи')
    ).toBe('https://zoom.us/j/12345?pwd=abc');
  });

  it('picks from location before description', () => {
    expect(
      extractZoomLink(
        'https://us02web.zoom.us/j/aaa',
        'https://zoom.us/j/bbb'
      )
    ).toBe('https://us02web.zoom.us/j/aaa');
  });

  it('strips trailing punctuation', () => {
    expect(extractZoomLink(null, '(см. https://zoom.us/j/777).')).toBe(
      'https://zoom.us/j/777'
    );
  });

  it('returns undefined when none found', () => {
    expect(extractZoomLink('https://example.com', 'no link')).toBeUndefined();
    expect(extractZoomLink(null, null, undefined)).toBeUndefined();
  });
});

describe('formatDateLabel', () => {
  it('timed event → "DD.MM HH:MM" in Tbilisi tz', () => {
    // 2026-05-20 10:00 UTC == 14:00 Tbilisi (UTC+4)
    const start = Date.UTC(2026, 4, 20, 10, 0);
    const end = Date.UTC(2026, 4, 20, 11, 0);
    expect(formatDateLabel(start, end, false, TZ)).toBe('20.05 14:00');
  });

  it('single-day all-day → "DD.MM"', () => {
    const start = Date.UTC(2026, 4, 20);
    const end = Date.UTC(2026, 4, 21);
    expect(formatDateLabel(start, end, true, TZ)).toBe('20.05');
  });

  it('multi-day all-day → "DD.MM–DD.MM"', () => {
    const start = Date.UTC(2026, 4, 20);
    const end = Date.UTC(2026, 4, 23);
    expect(formatDateLabel(start, end, true, TZ)).toBe('20.05–22.05');
  });
});

describe('gcalEventToFirestore', () => {
  it('maps timed event with zoom in location', () => {
    const result = gcalEventToFirestore(
      {
        id: 'evt1',
        summary: 'Лекция',
        location: 'https://zoom.us/j/999',
        start: { dateTime: '2026-05-20T14:00:00+04:00', timeZone: 'Asia/Tbilisi' },
        end: { dateTime: '2026-05-20T15:30:00+04:00', timeZone: 'Asia/Tbilisi' },
        updated: '2026-05-01T10:00:00.000Z',
      },
      TZ
    );
    expect(result).toMatchObject({
      gcalEventId: 'evt1',
      text: 'Лекция',
      dateLabel: '20.05 14:00',
      isAllDay: false,
      zoomLink: 'https://zoom.us/j/999',
    });
    expect(result?.startAtMs).toBe(Date.parse('2026-05-20T14:00:00+04:00'));
    expect(result?.remoteUpdatedMs).toBe(Date.parse('2026-05-01T10:00:00.000Z'));
  });

  it('maps all-day event', () => {
    const result = gcalEventToFirestore(
      {
        id: 'evt2',
        summary: 'Выходной',
        start: { date: '2026-05-20' },
        end: { date: '2026-05-21' },
      },
      TZ
    );
    expect(result?.isAllDay).toBe(true);
    expect(result?.dateLabel).toBe('20.05');
  });

  it('falls back to "(без названия)" when summary is empty', () => {
    const result = gcalEventToFirestore(
      {
        id: 'evt3',
        start: { dateTime: '2026-05-20T14:00:00+04:00' },
        end: { dateTime: '2026-05-20T15:00:00+04:00' },
      },
      TZ
    );
    expect(result?.text).toBe('(без названия)');
  });

  it('returns null when id is missing', () => {
    expect(
      gcalEventToFirestore(
        { start: { dateTime: '2026-05-20T14:00:00+04:00' }, end: null },
        TZ
      )
    ).toBeNull();
  });

  it('returns null when start is missing', () => {
    expect(gcalEventToFirestore({ id: 'x' }, TZ)).toBeNull();
  });

  it('extracts zoom from description if location empty', () => {
    const result = gcalEventToFirestore(
      {
        id: 'evt4',
        summary: 'Семинар',
        description: 'Приходите на https://us02web.zoom.us/j/123?pwd=xyz',
        start: { dateTime: '2026-05-20T14:00:00+04:00' },
        end: { dateTime: '2026-05-20T15:00:00+04:00' },
      },
      TZ
    );
    expect(result?.zoomLink).toBe('https://us02web.zoom.us/j/123?pwd=xyz');
  });
});

describe('firestoreEventToGCal', () => {
  it('creates timed payload with zoom in location+description', () => {
    const payload = firestoreEventToGCal(
      {
        id: 'fs1',
        text: 'Лекция',
        startAtMs: Date.UTC(2026, 4, 20, 10, 0),
        endAtMs: Date.UTC(2026, 4, 20, 11, 30),
        isAllDay: false,
        zoomLink: 'https://zoom.us/j/555',
      },
      TZ
    );
    expect(payload.summary).toBe('Лекция');
    expect(payload.location).toBe('https://zoom.us/j/555');
    expect(payload.description).toContain('https://zoom.us/j/555');
    expect(payload.start.dateTime).toBe('2026-05-20T10:00:00.000Z');
    expect(payload.start.timeZone).toBe('Asia/Tbilisi');
    expect(payload.extendedProperties?.private?.firestoreEventId).toBe('fs1');
  });

  it('creates all-day payload without time', () => {
    const payload = firestoreEventToGCal(
      {
        id: 'fs2',
        text: 'День открытых дверей',
        startAtMs: Date.UTC(2026, 4, 20),
        endAtMs: Date.UTC(2026, 4, 21),
        isAllDay: true,
      },
      TZ
    );
    expect(payload.start.date).toBe('2026-05-20');
    expect(payload.end.date).toBe('2026-05-21');
    expect(payload.start.dateTime).toBeUndefined();
  });
});

describe('resolveLWW', () => {
  it('remote wins when remote is newer', () => {
    expect(resolveLWW(100, 200)).toBe('remote');
  });

  it('local wins when local is newer', () => {
    expect(resolveLWW(300, 200)).toBe('local');
  });

  it('same when equal', () => {
    expect(resolveLWW(100, 100)).toBe('same');
  });
});
