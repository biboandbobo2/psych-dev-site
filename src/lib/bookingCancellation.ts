const BOOKING_TIME_ZONE = 'Asia/Tbilisi';
const BOOKING_UTC_OFFSET = '+04:00';

function getDatePartsInBookingTimeZone(value: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

export function getBookingCancelDeadline(bookingDatetime: string): Date {
  const bookingDate = new Date(bookingDatetime);
  const { year, month, day } = getDatePartsInBookingTimeZone(bookingDate);
  const deadline = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T21:00:00${BOOKING_UTC_OFFSET}`
  );
  deadline.setDate(deadline.getDate() - 1);
  return deadline;
}

export function canCancelBooking(bookingDatetime: string, nowMs = Date.now()): boolean {
  return nowMs < getBookingCancelDeadline(bookingDatetime).getTime();
}

export function getBookingCancelDeadlineDateParts(bookingDatetime: string) {
  return getDatePartsInBookingTimeZone(getBookingCancelDeadline(bookingDatetime));
}
