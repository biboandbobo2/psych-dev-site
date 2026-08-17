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
