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
      "Только super-admin может управлять со-админами"
    );
  }
  return context.auth.uid;
}

/**
 * Назначение пользователя со-админом.
 * Со-админ — ограниченная роль: доступ только к редактору страниц
 * (/superadmin/pages*). Прав admin/super-admin не даёт.
 * Только super-admin.
 */
export const makeUserCoAdmin = functions.https.onCall(async (data, context) => {
  const callerUid = assertSuperAdmin(context);
  const { targetUid, targetEmail } = data as {
    targetUid?: string;
    targetEmail?: string;
  };

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

  const currentRole = userDoc.data()?.role;
  if (currentRole === "admin" || currentRole === "super-admin") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Этот пользователь уже admin/super-admin. Сначала снимите текущую роль."
    );
  }

  await db.collection("users").doc(userUid).update({
    role: "co-admin",
    promotedAt: FieldValue.serverTimestamp(),
    promotedBy: callerUid,
  });

  await adminAuth.setCustomUserClaims(userUid, { role: "co-admin" });

  functions.logger.info(`✅ User ${userUid} promoted to co-admin`, { by: callerUid });

  return {
    success: true,
    message: "Пользователь назначен со-админом",
    uid: userUid,
  };
});

/**
 * Снятие роли со-админа. Удаляет поле role и custom claims.
 * Только super-admin. Работает только для пользователей с role='co-admin',
 * чтобы случайно не снять роль обычного admin.
 */
export const removeCoAdmin = functions.https.onCall(async (data, context) => {
  const callerUid = assertSuperAdmin(context);
  const { targetUid } = data as { targetUid?: string };

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "Не указан UID пользователя");
  }
  if (callerUid === targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "Нельзя снять права у самого себя");
  }

  const userRef = db.collection("users").doc(targetUid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Пользователь не найден");
  }

  const currentRole = userDoc.data()?.role;
  if (currentRole !== "co-admin") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Снять можно только со-админа. Для admin используйте кнопку «Снять права»."
    );
  }

  await userRef.update({
    role: FieldValue.delete(),
    demotedAt: FieldValue.serverTimestamp(),
    demotedBy: callerUid,
  });

  await adminAuth.setCustomUserClaims(targetUid, {});

  functions.logger.info(`✅ User ${targetUid} demoted from co-admin`, { by: callerUid });
  return { success: true, message: "Права со-админа сняты" };
});
