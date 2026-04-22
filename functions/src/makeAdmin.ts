import * as functions from "firebase-functions";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { SUPER_ADMIN_EMAIL } from "./lib/shared.js";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const adminAuth = getAuth();

function assertSuperAdmin(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }
  const callerEmail = context.auth.token.email as string | undefined;
  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Только super-admin может управлять администраторами"
    );
  }
  return context.auth.uid;
}

function normalizeEditableCourses(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    )
  );
}

/**
 * Назначение пользователя администратором с явным списком редактируемых курсов.
 * Только super-admin. Список курсов обязателен и должен быть непустым.
 */
export const makeUserAdmin = functions.https.onCall(async (data, context) => {
  const callerUid = assertSuperAdmin(context);
  const { targetUid, targetEmail } = data as {
    targetUid?: string;
    targetEmail?: string;
  };
  const editableCourses = normalizeEditableCourses((data as Record<string, unknown>).editableCourses);

  if (editableCourses.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Укажите хотя бы один курс, который админ сможет редактировать"
    );
  }

  let userUid = targetUid;
  if (targetEmail && !userUid) {
    try {
      const userRecord = await adminAuth.getUserByEmail(targetEmail);
      userUid = userRecord.uid;
    } catch {
      throw new functions.https.HttpsError(
        "not-found",
        `Пользователь с email ${targetEmail} не найден. Он должен хотя бы раз войти на сайт.`
      );
    }
  }

  if (!userUid) {
    throw new functions.https.HttpsError("invalid-argument", "Не указан UID или email пользователя");
  }

  const userDoc = await db.collection("users").doc(userUid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Пользователь должен хотя бы раз войти на сайт через Google"
    );
  }

  await db.collection("users").doc(userUid).update({
    role: "admin",
    adminEditableCourses: editableCourses,
    promotedAt: FieldValue.serverTimestamp(),
    promotedBy: callerUid,
  });

  await adminAuth.setCustomUserClaims(userUid, {
    role: "admin",
    editableCourses,
  });

  functions.logger.info(`✅ User ${userUid} promoted to admin`, {
    editableCourses,
    by: callerUid,
  });

  return {
    success: true,
    message: "Пользователь назначен администратором",
    uid: userUid,
    editableCourses,
  };
});

/**
 * Снятие роли администратора. Удаляет поля role и adminEditableCourses,
 * очищает custom claims.
 */
export const removeAdmin = functions.https.onCall(async (data, context) => {
  const callerUid = assertSuperAdmin(context);
  const { targetUid } = data as { targetUid?: string };

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "Не указан UID пользователя");
  }
  if (callerUid === targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "Нельзя снять права у самого себя");
  }

  await db.collection("users").doc(targetUid).update({
    role: FieldValue.delete(),
    adminEditableCourses: FieldValue.delete(),
    demotedAt: FieldValue.serverTimestamp(),
    demotedBy: callerUid,
  });

  await adminAuth.setCustomUserClaims(targetUid, {});

  functions.logger.info(`✅ User ${targetUid} demoted from admin`, { by: callerUid });
  return { success: true, message: "Права администратора сняты" };
});

/**
 * Обновление списка курсов, которые админ может редактировать.
 * Только super-admin, только для существующих админов, массив не пустой.
 */
export const setAdminEditableCourses = functions.https.onCall(async (data, context) => {
  const callerUid = assertSuperAdmin(context);
  const { targetUid } = data as { targetUid?: string };
  const editableCourses = normalizeEditableCourses((data as Record<string, unknown>).editableCourses);

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "Не указан UID пользователя");
  }
  if (editableCourses.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Укажите хотя бы один курс, который админ сможет редактировать"
    );
  }

  const userRef = db.collection("users").doc(targetUid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Пользователь не найден");
  }

  const role = userDoc.data()?.role;
  if (role !== "admin") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Editable courses можно задать только пользователю с ролью admin"
    );
  }

  await userRef.update({ adminEditableCourses: editableCourses });
  await adminAuth.setCustomUserClaims(targetUid, { role: "admin", editableCourses });

  functions.logger.info(`✅ Admin ${targetUid} editable courses updated`, {
    editableCourses,
    by: callerUid,
  });
  return { success: true, editableCourses };
});
