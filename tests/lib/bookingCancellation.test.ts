import { describe, expect, it } from 'vitest';
import {
  canCancelBooking,
  getBookingCancelDeadline,
  getBookingCancelDeadlineDateParts,
  BOOKING_UTC_OFFSET,
} from '../../src/lib/bookingCancellation';

describe('bookingCancellation', () => {
  describe('getBookingCancelDeadline', () => {
    it('возвращает 21:00 за день до бронирования', () => {
      const deadline = getBookingCancelDeadline('2026-04-15T14:00:00+04:00');
      // Deadline = April 14 at 21:00 Tbilisi time
      expect(deadline.toISOString()).toBe(new Date(`2026-04-14T21:00:00${BOOKING_UTC_OFFSET}`).toISOString());
    });

    it('корректно обрабатывает бронирование на 9:00 утра', () => {
      const deadline = getBookingCancelDeadline('2026-04-13T09:00:00+04:00');
      // Deadline = April 12 at 21:00 Tbilisi time
      expect(deadline.toISOString()).toBe(new Date(`2026-04-12T21:00:00${BOOKING_UTC_OFFSET}`).toISOString());
    });

    it('корректно обрабатывает бронирование на 22:00', () => {
      const deadline = getBookingCancelDeadline('2026-04-20T22:00:00+04:00');
      expect(deadline.toISOString()).toBe(new Date(`2026-04-19T21:00:00${BOOKING_UTC_OFFSET}`).toISOString());
    });

    it('корректно обрабатывает переход через границу месяца', () => {
      const deadline = getBookingCancelDeadline('2026-05-01T10:00:00+04:00');
      // Deadline = April 30 at 21:00
      expect(deadline.toISOString()).toBe(new Date(`2026-04-30T21:00:00${BOOKING_UTC_OFFSET}`).toISOString());
    });
  });

  describe('canCancelBooking', () => {
    const booking = '2026-04-15T14:00:00+04:00';
    // Deadline: April 14 at 21:00+04:00
    const deadlineMs = new Date(`2026-04-14T21:00:00${BOOKING_UTC_OFFSET}`).getTime();

    it('разрешает отмену до дедлайна', () => {
      const beforeDeadline = deadlineMs - 60_000; // 1 minute before
      expect(canCancelBooking(booking, beforeDeadline)).toBe(true);
    });

    it('запрещает отмену в момент дедлайна', () => {
      expect(canCancelBooking(booking, deadlineMs)).toBe(false);
    });

    it('запрещает отмену после дедлайна', () => {
      const afterDeadline = deadlineMs + 60_000;
      expect(canCancelBooking(booking, afterDeadline)).toBe(false);
    });

    it('разрешает отмену за сутки до', () => {
      const dayBefore = deadlineMs - 24 * 3600_000;
      expect(canCancelBooking(booking, dayBefore)).toBe(true);
    });
  });

  describe('getBookingCancelDeadlineDateParts', () => {
    it('возвращает дату дедлайна в таймзоне бронирования', () => {
      const parts = getBookingCancelDeadlineDateParts('2026-04-15T14:00:00+04:00');
      expect(parts.year).toBe(2026);
      expect(parts.month).toBe(4);
      expect(parts.day).toBe(14);
    });

    it('корректно обрабатывает переход через границу года', () => {
      const parts = getBookingCancelDeadlineDateParts('2027-01-01T10:00:00+04:00');
      expect(parts.year).toBe(2026);
      expect(parts.month).toBe(12);
      expect(parts.day).toBe(31);
    });
  });
});
