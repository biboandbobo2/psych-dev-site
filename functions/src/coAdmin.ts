import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { SUPER_ADMIN_EMAIL } from "./lib/shared.js";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты (cpu до 1 vCPU и т.п.), не выкручиваем ресурсы.
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
      "Только super-admin может управлять со-админами"
    );
  }
  return request.auth.uid;
}

/**
 * Назначение пользователя со-админом.
 * Со-админ — параллельная роль для редактора страниц `/superadmin/pages*`.
 * Не пересекается с admin/super-admin: можно дать поверх admin'а.
 * Только super-admin.
 */
export const makeUserCoAdmin = onCall(CALLABLE_OPTS, async (request) => {
  const callerUid = assertSuperAdmin(request);
  const { targetUid, targetEmail } = request.data as {
    targetUid?: string;
    targetEmail?: string;
  };

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
    coAdmin: true,
    coAdminPromotedAt: FieldValue.serverTimestamp(),
    coAdminPromotedBy: callerUid,
  });

  // Merge claims — не затираем role/editableCourses, если они есть.
  const userRecord = await adminAuth.getUser(userUid);
  const existingClaims = userRecord.customClaims ?? {};
  await adminAuth.setCustomUserClaims(userUid, { ...existingClaims, coAdmin: true });

  fnLogger.info(`✅ User ${userUid} promoted to co-admin`, { by: callerUid });

  return {
    success: true,
    message: "Пользователь назначен со-админом",
    uid: userUid,
  };
});

/**
 * Снятие роли со-админа. Сбрасывает поле coAdmin и убирает claim,
 * остальные claims (например role: 'admin') остаются нетронутыми.
 * Только super-admin.
 */
export const removeCoAdmin = onCall(CALLABLE_OPTS, async (request) => {
  const callerUid = assertSuperAdmin(request);
  const { targetUid } = request.data as { targetUid?: string };

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Не указан UID пользователя");
  }
  if (callerUid === targetUid) {
    throw new HttpsError("invalid-argument", "Нельзя снять права у самого себя");
  }

  const userRef = db.collection("users").doc(targetUid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Пользователь не найден");
  }

  await userRef.update({
    coAdmin: FieldValue.delete(),
    coAdminPromotedAt: FieldValue.delete(),
    coAdminPromotedBy: FieldValue.delete(),
    coAdminDemotedAt: FieldValue.serverTimestamp(),
    coAdminDemotedBy: callerUid,
  });

  // Merge claims: сохраняем role, удаляем только coAdmin.
  const userRecord = await adminAuth.getUser(targetUid);
  const existingClaims = userRecord.customClaims ?? {};
  const { coAdmin: _removed, ...rest } = existingClaims as { coAdmin?: boolean } & Record<string, unknown>;
  void _removed;
  await adminAuth.setCustomUserClaims(targetUid, rest);

  fnLogger.info(`✅ User ${targetUid} demoted from co-admin`, { by: callerUid });
  return { success: true, message: "Права со-админа сняты" };
});
