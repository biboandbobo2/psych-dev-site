import type { Timestamp } from 'firebase/firestore';

/**
 * Корневая сущность экзамена. Один документ = один экзамен на конкретный
 * курс/семестр (например, "Зачёт по общей психологии, весна 2026"). Дочерние
 * слоты, детали броней и эссе живут в подколлекциях.
 */
export interface Exam {
  id: string;
  title: string;
  courseId: string;
  /** ID групп-участников (`groups/{groupId}`). Один слот вмещает по одному студенту из каждой. */
  groupIds: string[];
  slotDurationMinutes: number;
  essayMinChars: number;
  essayMaxChars: number;
  cancelLeadTimeHours: number;
  /** IANA TZ для отображения. Хранение времени — всегда UTC через Timestamp. */
  timezone: string;
  status: ExamStatus;
  /** Текст карточки-объявления, которая показывается студентам на /home. */
  announcement: ExamAnnouncement;
  createdAt: Timestamp | null;
  createdBy: string;
  updatedAt: Timestamp | null;
}

export type ExamStatus = 'active' | 'archived';

export interface ExamAnnouncement {
  title: string;
  body: string;
}

/**
 * Один временной слот. Поле `bookings` хранит только публичный факт
 * занятости — без имён. Имена и эссе лежат отдельно с приватным read.
 */
export interface ExamSlot {
  id: string;
  startAt: Timestamp;
  endAt: Timestamp;
  /** Map groupId → факт занятости или null. Ключи всегда из exam.groupIds. */
  bookings: Record<string, ExamSlotBookingFact | null>;
  createdAt: Timestamp | null;
  createdBy: string;
}

/** Публичный факт «гнездо занято» — без имён, чтобы соседи по слоту друг друга не видели. */
export interface ExamSlotBookingFact {
  bookedAt: Timestamp;
}

/**
 * Приватные детали брони. Document ID = `${slotId}__${groupId}`.
 * Read: владелец брони или super-admin. Write: только server-side.
 */
export interface ExamBookingDetails {
  slotId: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  bookedAt: Timestamp;
}

/** Эссе студента. Read только владелец и super-admin. Редактирование запрещено. */
export interface ExamEssay {
  userId: string;
  slotId: string;
  groupId: string;
  text: string;
  charCount: number;
  createdAt: Timestamp;
}

/** Индекс «у юзера есть бронь». Используется для O(1) проверки уникальности. */
export interface ExamUserIndex {
  slotId: string;
  groupId: string;
  bookedAt: Timestamp;
}

export const examBookingDetailsId = (slotId: string, groupId: string): string =>
  `${slotId}__${groupId}`;
