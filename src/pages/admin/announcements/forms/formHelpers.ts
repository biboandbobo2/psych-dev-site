import type { GroupAnnouncement, GroupEvent } from '../../../../types/groupFeed';
import type { AnnouncementFormValue } from './AnnouncementForm';
import type { AssignmentFormValue } from './AssignmentForm';
import type { EventFormValue } from './EventForm';

export const EMPTY_ANNOUNCEMENT_FORM: AnnouncementFormValue = {
  text: '',
  newsType: 'tech',
};

export function announcementToFormValue(item: GroupAnnouncement): AnnouncementFormValue {
  return {
    text: item.text ?? '',
    newsType: item.newsType ?? null,
  };
}

export const EMPTY_ASSIGNMENT_FORM: AssignmentFormValue = {
  text: '',
  dueDate: '',
  longText: '',
};

export function assignmentToFormValue(event: GroupEvent): AssignmentFormValue {
  return {
    text: event.text ?? '',
    dueDate: event.dueDate ?? '',
    longText: event.longText ?? '',
  };
}

export const EMPTY_EVENT_FORM: EventFormValue = {
  text: '',
  startAtMs: null,
  endAtMs: null,
  isAllDay: false,
  zoomLink: '',
  siteLink: '',
};

export function eventToFormValue(event: GroupEvent): EventFormValue {
  return {
    text: event.text ?? '',
    startAtMs: event.startAt?.toMillis?.() ?? null,
    endAtMs: event.endAt?.toMillis?.() ?? null,
    isAllDay: Boolean(event.isAllDay),
    zoomLink: event.zoomLink ?? '',
    siteLink: event.siteLink ?? '',
  };
}

export const MAX_EVENT_REPEATS = 30;

function shiftWeeks(ms: number, weeks: number): number {
  if (weeks === 0) return ms;
  const date = new Date(ms);
  date.setDate(date.getDate() + weeks * 7);
  return date.getTime();
}

/**
 * Даты серии однотипных занятий: k-е сдвинуто на k*intervalWeeks недель.
 * Сдвигаем календарными днями, а не миллисекундами, чтобы время начала
 * пережило переход на летнее/зимнее время.
 */
export function buildEventOccurrences(
  startAtMs: number,
  endAtMs: number,
  intervalWeeks: number,
  count: number
): Array<{ startAtMs: number; endAtMs: number }> {
  const total =
    intervalWeeks > 0 ? Math.max(1, Math.min(Math.floor(count), MAX_EVENT_REPEATS)) : 1;
  const occurrences: Array<{ startAtMs: number; endAtMs: number }> = [];
  for (let i = 0; i < total; i += 1) {
    const offset = intervalWeeks * i;
    occurrences.push({
      startAtMs: shiftWeeks(startAtMs, offset),
      endAtMs: shiftWeeks(endAtMs, offset),
    });
  }
  return occurrences;
}
