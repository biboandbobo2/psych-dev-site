import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { SUPER_ADMIN_EMAIL } from "./lib/shared.js";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты, не выкручиваем ресурсы.
const CALLABLE_OPTS = { region: "us-central1", cpu: 1, memory: "256MiB" } as const;

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const adminAuth = getAuth();

function assertSuperAdmin(request: Pick<CallableRequest, "auth">): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  const callerEmail = request.auth.token.email as string | undefined;
  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError(
      "permission-denied",
      "Только super-admin может управлять администраторами"
    );
  }
  return request.auth.uid;
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
export const makeUserAdmin = onCall(CALLABLE_OPTS, async (request) => {
  const callerUid = assertSuperAdmin(request);
  const { targetUid, targetEmail } = request.data as {
    targetUid?: string;
    targetEmail?: string;
  };
  const editableCourses = normalizeEditableCourses((request.data as Record<string, unknown>).editableCourses);

  if (editableCourses.length === 0) {
    throw new HttpsError(
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
      throw new HttpsError(
        "not-found",
        `Пользователь с email ${targetEmail} не найден. Он должен хотя бы раз войти на сайт.`
      );
    }
  }

  if (!userUid) {
    throw new HttpsError("invalid-argument", "Не указан UID или email пользователя");
  }

  const userDoc = await db.collection("users").doc(userUid).get();
  if (!userDoc.exists) {
    throw new HttpsError(
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

  // Merge claims: добавляем admin-claims, не затирая coAdmin (параллельная роль).
  const userRecord = await adminAuth.getUser(userUid);
  const existingClaims = userRecord.customClaims ?? {};
  await adminAuth.setCustomUserClaims(userUid, {
    ...existingClaims,
    role: "admin",
    editableCourses,
  });

  fnLogger.info(`✅ User ${userUid} promoted to admin`, {
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
export const removeAdmin = onCall(CALLABLE_OPTS, async (request) => {
  const callerUid = assertSuperAdmin(request);
  const { targetUid } = request.data as { targetUid?: string };

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Не указан UID пользователя");
  }
  if (callerUid === targetUid) {
    throw new HttpsError("invalid-argument", "Нельзя снять права у самого себя");
  }

  await db.collection("users").doc(targetUid).update({
    role: FieldValue.delete(),
    adminEditableCourses: FieldValue.delete(),
    demotedAt: FieldValue.serverTimestamp(),
    demotedBy: callerUid,
  });

  // Merge claims: убираем role/editableCourses, сохраняем coAdmin (если есть).
  const userRecord = await adminAuth.getUser(targetUid);
  const existingClaims = userRecord.customClaims ?? {};
  const { role: _r, editableCourses: _ec, ...rest } = existingClaims as {
    role?: string;
    editableCourses?: string[];
  } & Record<string, unknown>;
  void _r;
  void _ec;
  await adminAuth.setCustomUserClaims(targetUid, rest);

  fnLogger.info(`✅ User ${targetUid} demoted from admin`, { by: callerUid });
  return { success: true, message: "Права администратора сняты" };
});

/**
 * Обновление списка курсов, которые админ может редактировать.
 * Только super-admin, только для существующих админов, массив не пустой.
 */
export const setAdminEditableCourses = onCall(CALLABLE_OPTS, async (request) => {
  const callerUid = assertSuperAdmin(request);
  const { targetUid } = request.data as { targetUid?: string };
  const editableCourses = normalizeEditableCourses((request.data as Record<string, unknown>).editableCourses);

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Не указан UID пользователя");
  }
  if (editableCourses.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Укажите хотя бы один курс, который админ сможет редактировать"
    );
  }

  const userRef = db.collection("users").doc(targetUid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Пользователь не найден");
  }

  const role = userDoc.data()?.role;
  if (role !== "admin") {
    throw new HttpsError(
      "failed-precondition",
      "Editable courses можно задать только пользователю с ролью admin"
    );
  }

  await userRef.update({ adminEditableCourses: editableCourses });
  // Merge claims: обновляем editableCourses, сохраняя coAdmin и прочие.
  const userRecord = await adminAuth.getUser(targetUid);
  const existingClaims = userRecord.customClaims ?? {};
  await adminAuth.setCustomUserClaims(targetUid, {
    ...existingClaims,
    role: "admin",
    editableCourses,
  });

  fnLogger.info(`✅ Admin ${targetUid} editable courses updated`, {
    editableCourses,
    by: callerUid,
  });
  return { success: true, editableCourses };
});
