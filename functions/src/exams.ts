// Cloud Functions для бронирования экзамена. Атомарная транзакция через
// Admin SDK обходит rules и пишет 4 документа сразу: слот (map bookings),
// детали брони, эссе, индекс «у юзера есть бронь». Это даёт корректность
// без затирания чужих гнёзд и быстрых проверок «один юзер — одна бронь».
//
// Стоимость: ~60 invocations за весь экзамен (15 слотов × 2 потока × 2 операции).

import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import {
  getFirestore,
  Timestamp,
  type Transaction,
} from "firebase-admin/firestore";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты (cpu до 1 vCPU и т.п.), не выкручиваем ресурсы.
const CALLABLE_OPTS = { region: "us-central1", cpu: 1, memory: "256MiB" } as const;

const db = getFirestore();

interface ExamDocData {
  status: "active" | "archived";
  groupIds: string[];
  essayMinChars: number;
  essayMaxChars: number;
  cancelLeadTimeHours: number;
}

interface SlotDocData {
  startAt: Timestamp;
  bookings: Record<string, { bookedAt: Timestamp } | null>;
}

interface UserIndexDocData {
  slotId: string;
  groupId: string;
}

const detailsId = (slotId: string, groupId: string): string =>
  `${slotId}__${groupId}`;

function requireAuth(
  request: Pick<CallableRequest, "auth">
): { uid: string; email: string } {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Требуется авторизация"
    );
  }
  const uid = request.auth.uid;
  const email = request.auth.token.email ?? "";
  return { uid, email };
}

async function loadExam(examId: string): Promise<ExamDocData> {
  const snap = await db.doc(`exams/${examId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Экзамен не найден");
  }
  const data = snap.data() as Partial<ExamDocData> | undefined;
  if (!data || !Array.isArray(data.groupIds)) {
    throw new HttpsError(
      "failed-precondition",
      "Документ экзамена повреждён"
    );
  }
  return {
    status: data.status === "archived" ? "archived" : "active",
    groupIds: data.groupIds,
    essayMinChars: typeof data.essayMinChars === "number" ? data.essayMinChars : 0,
    essayMaxChars: typeof data.essayMaxChars === "number" ? data.essayMaxChars : 0,
    cancelLeadTimeHours:
      typeof data.cancelLeadTimeHours === "number"
        ? data.cancelLeadTimeHours
        : 48,
  };
}

/**
 * Определяет единственную группу юзера среди групп экзамена. Если юзер
 * состоит в нескольких — кидает ошибку (это нештатное состояние данных,
 * super-admin должен почистить).
 */
async function resolveStudentGroup(
  uid: string,
  examGroupIds: string[]
): Promise<string> {
  const matches: string[] = [];
  await Promise.all(
    examGroupIds.map(async (groupId) => {
      const snap = await db.doc(`groups/${groupId}`).get();
      const memberIds = (snap.data()?.memberIds as string[] | undefined) ?? [];
      if (memberIds.includes(uid)) {
        matches.push(groupId);
      }
    })
  );
  if (matches.length === 0) {
    throw new HttpsError(
      "permission-denied",
      "Вы не состоите ни в одной группе этого экзамена"
    );
  }
  if (matches.length > 1) {
    throw new HttpsError(
      "failed-precondition",
      "Вы состоите в нескольких группах одновременно — обратитесь к администратору"
    );
  }
  return matches[0];
}

interface BookExamSlotPayload {
  examId?: unknown;
  slotId?: unknown;
  essay?: unknown;
}

export const bookExamSlot = onCall(CALLABLE_OPTS, async (request) => {
    const data = request.data as BookExamSlotPayload;
    const { uid, email } = requireAuth(request);

    const examId = typeof data.examId === "string" ? data.examId.trim() : "";
    const slotId = typeof data.slotId === "string" ? data.slotId.trim() : "";
    const essay = typeof data.essay === "string" ? data.essay.trim() : "";

    if (!examId || !slotId) {
      throw new HttpsError(
        "invalid-argument",
        "examId и slotId обязательны"
      );
    }

    const exam = await loadExam(examId);
    if (exam.status !== "active") {
      throw new HttpsError(
        "failed-precondition",
        "Экзамен в архиве, запись закрыта"
      );
    }
    if (essay.length < exam.essayMinChars) {
      throw new HttpsError(
        "invalid-argument",
        `Эссе должно быть не короче ${exam.essayMinChars} символов`
      );
    }
    if (essay.length > exam.essayMaxChars) {
      throw new HttpsError(
        "invalid-argument",
        `Эссе должно быть не длиннее ${exam.essayMaxChars} символов`
      );
    }

    const myGroupId = await resolveStudentGroup(uid, exam.groupIds);

    const userSnap = await db.doc(`users/${uid}`).get();
    const userName =
      (userSnap.data()?.displayName as string | undefined)?.trim() || email || uid;

    const slotRef = db.doc(`exams/${examId}/slots/${slotId}`);
    const userIndexRef = db.doc(`exams/${examId}/userIndex/${uid}`);
    const detailsRef = db.doc(
      `exams/${examId}/bookingDetails/${detailsId(slotId, myGroupId)}`
    );
    const essayRef = db.doc(`exams/${examId}/essays/${uid}`);

    await db.runTransaction(async (tx: Transaction) => {
      const [slotSnap, userIndexSnap] = await Promise.all([
        tx.get(slotRef),
        tx.get(userIndexRef),
      ]);

      if (!slotSnap.exists) {
        throw new HttpsError("not-found", "Слот не найден");
      }
      if (userIndexSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "У вас уже есть запись на экзамен. Сначала отмените текущую."
        );
      }

      const slot = slotSnap.data() as SlotDocData;
      const bookings = slot.bookings ?? {};
      if (!(myGroupId in bookings)) {
        throw new HttpsError(
          "failed-precondition",
          "Этот слот не настроен на вашу группу"
        );
      }
      if (bookings[myGroupId] != null) {
        throw new HttpsError(
          "already-exists",
          "Это место в слоте уже занято — обновите страницу"
        );
      }

      const now = Timestamp.now();
      tx.update(slotRef, { [`bookings.${myGroupId}`]: { bookedAt: now } });
      tx.set(detailsRef, {
        slotId,
        groupId: myGroupId,
        userId: uid,
        userName,
        userEmail: email,
        bookedAt: now,
      });
      tx.set(essayRef, {
        userId: uid,
        slotId,
        groupId: myGroupId,
        text: essay,
        charCount: essay.length,
        createdAt: now,
      });
      tx.set(userIndexRef, {
        slotId,
        groupId: myGroupId,
        bookedAt: now,
      });
    });

    return { ok: true, slotId, groupId: myGroupId };
  }
);

interface CancelExamBookingPayload {
  examId?: unknown;
}

export const cancelExamBooking = onCall(CALLABLE_OPTS, async (request) => {
    const data = request.data as CancelExamBookingPayload;
    const { uid } = requireAuth(request);

    const examId = typeof data.examId === "string" ? data.examId.trim() : "";
    if (!examId) {
      throw new HttpsError(
        "invalid-argument",
        "examId обязателен"
      );
    }

    const exam = await loadExam(examId);

    const userIndexRef = db.doc(`exams/${examId}/userIndex/${uid}`);

    await db.runTransaction(async (tx: Transaction) => {
      const userIndexSnap = await tx.get(userIndexRef);
      if (!userIndexSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "У вас нет активной записи на этот экзамен"
        );
      }
      const idx = userIndexSnap.data() as UserIndexDocData;
      const { slotId, groupId } = idx;

      const slotRef = db.doc(`exams/${examId}/slots/${slotId}`);
      const slotSnap = await tx.get(slotRef);
      if (!slotSnap.exists) {
        throw new HttpsError("not-found", "Слот не найден");
      }
      const slot = slotSnap.data() as SlotDocData;

      const nowMs = Timestamp.now().toMillis();
      const startMs = slot.startAt.toMillis();
      const deadlineMs = startMs - exam.cancelLeadTimeHours * 3600 * 1000;
      if (nowMs > deadlineMs) {
        throw new HttpsError(
          "failed-precondition",
          `Отмена возможна не позднее чем за ${exam.cancelLeadTimeHours} часов до экзамена`
        );
      }

      const detailsRef = db.doc(
        `exams/${examId}/bookingDetails/${detailsId(slotId, groupId)}`
      );
      const essayRef = db.doc(`exams/${examId}/essays/${uid}`);

      tx.update(slotRef, { [`bookings.${groupId}`]: null });
      tx.delete(detailsRef);
      tx.delete(essayRef);
      tx.delete(userIndexRef);
    });

    return { ok: true };
  }
);
