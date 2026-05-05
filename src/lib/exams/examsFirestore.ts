import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Exam,
  ExamAnnouncement,
  ExamSlot,
  ExamSlotBookingFact,
} from '../../types/exam';

interface CreateExamInput {
  title: string;
  courseId: string;
  groupIds: string[];
  slotDurationMinutes: number;
  essayMinChars: number;
  essayMaxChars: number;
  cancelLeadTimeHours: number;
  timezone: string;
  announcement: ExamAnnouncement;
}

/** Создаёт экзамен (super-admin only). Возвращает examId. */
export async function createExam(
  input: CreateExamInput,
  createdBy: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'exams'), {
    ...input,
    status: 'active',
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

interface UpdateExamPatch {
  title?: string;
  announcement?: ExamAnnouncement;
  cancelLeadTimeHours?: number;
  essayMinChars?: number;
  essayMaxChars?: number;
}

export async function updateExam(
  examId: string,
  patch: UpdateExamPatch
): Promise<void> {
  await updateDoc(doc(db, 'exams', examId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveExam(examId: string): Promise<void> {
  await updateDoc(doc(db, 'exams', examId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Создаёт слот. bookings инициализируется как { groupId1: null, groupId2: null }.
 * Длительность задаётся в минутах.
 */
export async function createSlot(
  examId: string,
  startAt: Date,
  durationMinutes: number,
  groupIds: string[],
  createdBy: string
): Promise<string> {
  const startTs = Timestamp.fromDate(startAt);
  const endTs = Timestamp.fromMillis(startAt.getTime() + durationMinutes * 60_000);
  const bookings: Record<string, ExamSlotBookingFact | null> = {};
  for (const gid of groupIds) {
    bookings[gid] = null;
  }
  const ref = await addDoc(collection(db, 'exams', examId, 'slots'), {
    startAt: startTs,
    endAt: endTs,
    bookings,
    createdAt: serverTimestamp(),
    createdBy,
  });
  return ref.id;
}

/**
 * Удаление слота. Клиентская валидация: проверяем, что bookings все null.
 * На уровне rules super-admin может всё, поэтому защита здесь — UX-уровневая.
 */
export async function deleteSlotIfEmpty(
  examId: string,
  slot: Pick<ExamSlot, 'id' | 'bookings'>
): Promise<void> {
  const occupied = Object.values(slot.bookings).some((v) => v !== null);
  if (occupied) {
    throw new Error('Нельзя удалить слот с существующей бронью');
  }
  await deleteDoc(doc(db, 'exams', examId, 'slots', slot.id));
}

/**
 * Перемещает слот на другое время (super-admin only). При непустых бронях
 * запрещаем — экзаменатор должен сначала договориться об отмене.
 */
export async function rescheduleSlot(
  examId: string,
  slot: Pick<ExamSlot, 'id' | 'bookings'>,
  newStartAt: Date,
  durationMinutes: number
): Promise<void> {
  const occupied = Object.values(slot.bookings).some((v) => v !== null);
  if (occupied) {
    throw new Error('Нельзя сдвинуть слот с существующей бронью');
  }
  const startTs = Timestamp.fromDate(newStartAt);
  const endTs = Timestamp.fromMillis(newStartAt.getTime() + durationMinutes * 60_000);
  await setDoc(
    doc(db, 'exams', examId, 'slots', slot.id),
    { startAt: startTs, endAt: endTs },
    { merge: true }
  );
}

export function normalizeExamDoc(id: string, data: unknown): Exam | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const title = typeof raw.title === 'string' ? raw.title : '';
  const courseId = typeof raw.courseId === 'string' ? raw.courseId : '';
  const groupIds = Array.isArray(raw.groupIds)
    ? raw.groupIds.filter((x): x is string => typeof x === 'string')
    : [];
  if (!title || !courseId || groupIds.length === 0) return null;
  const status = raw.status === 'archived' ? 'archived' : 'active';
  const announcement =
    raw.announcement && typeof raw.announcement === 'object'
      ? (raw.announcement as ExamAnnouncement)
      : { title: '', body: '' };
  return {
    id,
    title,
    courseId,
    groupIds,
    slotDurationMinutes:
      typeof raw.slotDurationMinutes === 'number' ? raw.slotDurationMinutes : 40,
    essayMinChars:
      typeof raw.essayMinChars === 'number' ? raw.essayMinChars : 1000,
    essayMaxChars:
      typeof raw.essayMaxChars === 'number' ? raw.essayMaxChars : 3500,
    cancelLeadTimeHours:
      typeof raw.cancelLeadTimeHours === 'number' ? raw.cancelLeadTimeHours : 48,
    timezone: typeof raw.timezone === 'string' ? raw.timezone : 'Asia/Tbilisi',
    status,
    announcement,
    createdAt: (raw.createdAt as Timestamp | null | undefined) ?? null,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
    updatedAt: (raw.updatedAt as Timestamp | null | undefined) ?? null,
  };
}

export function normalizeSlotDoc(id: string, data: unknown): ExamSlot | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const startAt = raw.startAt as Timestamp | undefined;
  const endAt = raw.endAt as Timestamp | undefined;
  if (!startAt || !endAt) return null;
  const bookingsRaw = (raw.bookings as Record<string, unknown> | undefined) ?? {};
  const bookings: Record<string, ExamSlotBookingFact | null> = {};
  for (const [gid, val] of Object.entries(bookingsRaw)) {
    if (val && typeof val === 'object' && 'bookedAt' in val) {
      bookings[gid] = { bookedAt: (val as { bookedAt: Timestamp }).bookedAt };
    } else {
      bookings[gid] = null;
    }
  }
  return {
    id,
    startAt,
    endAt,
    bookings,
    createdAt: (raw.createdAt as Timestamp | null | undefined) ?? null,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
  };
}
