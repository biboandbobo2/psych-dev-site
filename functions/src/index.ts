// Cloud Functions (Node 22, ESM), firebase-admin v12+.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  resolveAdminProjectId,
  resolveAdminStorageBucket,
} from "./lib/adminApp.js";
import { getAdminSeedCode } from "./lib/adminSeedCode.js";
import {
  FUNCTIONS_SERVICE_ACCOUNT,
  SUPER_ADMIN_EMAIL,
  CALLABLE_OPTS,
} from "./lib/shared.js";
import {
  debugError as functionsDebugError,
  debugLog as functionsDebugLog,
} from "./lib/debug.js";

// Инициализация Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: resolveAdminProjectId(),
    storageBucket: resolveAdminStorageBucket(),
  });
}

/**
 * Callable: seedAdmin
 * По одноразовому коду добавляет пользователя в коллекцию admins/{uid}
 * и выставляет custom claim role: "admin".
 *
 * Требует аутентификации (Google Sign-In). Код берётся из Secret Manager.
 */
// serviceAccount: admin-seed-code в Secret Manager доступен только appspot SA.
export const seedAdmin = onCall(
  { ...CALLABLE_OPTS, serviceAccount: FUNCTIONS_SERVICE_ACCOUNT },
  async (request) => {
  const data = request.data;
  const uid = request.auth?.uid;
  const email = request.auth?.token?.email;
  const seedCode = (data?.seedCode ?? "").trim();

  functionsDebugLog("🔵 seedAdmin called", {
    hasAuth: !!request.auth,
    hasUid: Boolean(uid),
    hasEmail: Boolean(email),
    hasSeedCode: Boolean(seedCode),
  });

  if (!uid || !email) {
    functionsDebugError("❌ No UID or email");
    throw new HttpsError("unauthenticated", "Login required");
  }

  const expected = await getAdminSeedCode();
  functionsDebugLog("🔵 Expected seed code configured:", Boolean(expected));

  if (!expected || seedCode !== expected) {
    functionsDebugError("❌ Invalid seed code");
    throw new HttpsError("permission-denied", "Invalid code");
  }

  try {
    functionsDebugLog("🔵 Writing to Firestore admins collection...");
    await getFirestore().collection("admins").doc(uid).set(
      { email, createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    functionsDebugLog("✅ Firestore write successful");

    functionsDebugLog("🔵 Setting custom user claims...");
    await getAdminAuth().setCustomUserClaims(uid, { role: "admin" });
    functionsDebugLog("✅ Custom claims set successfully");

    const userRecord = await getAdminAuth().getUser(uid);
    functionsDebugLog("✅ User custom claims after setting:", userRecord.customClaims);

    return { ok: true, claims: userRecord.customClaims };
  } catch (err: any) {
    functionsDebugError("❌ Error in seedAdmin:", err);
    functionsDebugError("❌ Error code:", err?.code);
    functionsDebugError("❌ Error message:", err?.message);
    throw new HttpsError("internal", "Failed to set admin role: " + err?.message);
  }
});

/**
 * toggleUserDisabled - отключает/включает пользователя (только для super-admin)
 * Отключённый пользователь не может войти, но все его данные сохраняются.
 * При повторном включении — пользователь входит с тем же uid и данными.
 *
 * @param data.targetUid - UID пользователя
 * @param data.disabled - true = отключить, false = включить
 */
export const toggleUserDisabled = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  fnLogger.info("🔵 toggleUserDisabled called", {
    caller: request.auth?.uid,
    target: data?.targetUid,
    disabled: data?.disabled,
  });

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  // Только super-admin может отключать пользователей
  const callerEmail = request.auth.token?.email;
  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    fnLogger.error("❌ Caller is not super-admin", { callerEmail });
    throw new HttpsError(
      "permission-denied",
      "Только super-admin может отключать/включать пользователей"
    );
  }

  const targetUid = data?.targetUid;
  const disabled = data?.disabled;

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid is required");
  }

  if (typeof disabled !== "boolean") {
    throw new HttpsError("invalid-argument", "disabled must be boolean");
  }

  // Нельзя отключить самого себя
  if (request.auth.uid === targetUid) {
    throw new HttpsError("invalid-argument", "Нельзя отключить самого себя");
  }

  try {
    const authAdmin = getAdminAuth();
    const firestore = getFirestore();

    // Проверяем что пользователь существует
    const targetUser = await authAdmin.getUser(targetUid);
    fnLogger.info("✅ Target user found", { email: targetUser.email });

    // Обновляем статус disabled
    await authAdmin.updateUser(targetUid, { disabled });
    fnLogger.info("✅ User disabled status updated", { targetUid, disabled });

    // Записываем в Firestore для отображения в UI
    await firestore.collection("users").doc(targetUid).set(
      {
        disabled,
        disabledAt: disabled ? FieldValue.serverTimestamp() : null,
        disabledBy: disabled ? request.auth.uid : null,
        enabledAt: disabled ? null : FieldValue.serverTimestamp(),
        enabledBy: disabled ? null : request.auth.uid,
      },
      { merge: true }
    );

    return {
      success: true,
      targetUid,
      targetEmail: targetUser.email,
      disabled,
      message: disabled
        ? "Пользователь отключён. Он не сможет войти, но все данные сохранены."
        : "Пользователь включён. Он может войти и все его данные на месте.",
    };
  } catch (error: any) {
    fnLogger.error("❌ Error in toggleUserDisabled", {
      error: error?.message,
      code: error?.code,
    });

    if (error?.code === "auth/user-not-found") {
      throw new HttpsError("not-found", `Пользователь не найден`);
    }

    throw new HttpsError("internal", `Ошибка: ${error?.message}`);
  }
});

// Re-export functions from separate modules
export { onUserCreate } from './onUserCreate.js';
export { makeUserAdmin, removeAdmin, setAdminEditableCourses } from './makeAdmin.js';
export { makeUserCoAdmin, removeCoAdmin } from './coAdmin.js';
export {
  createGroup,
  updateGroup,
  setGroupMembers,
  addGroupMembersByEmail,
  deleteGroup,
  setGroupFeaturedCourses,
} from './groups.js';
export { setMyFeaturedCourses } from './users.js';
export { ingestBook } from './ingestBook.js';
export { ingestLectureRag } from './ingestLectureRag.js';
export { runVerify, runReconcile } from './verify.js';
export { updateCourseAccess, setUserRole } from './courseAccess.js';
export { bulkEnrollStudents, getStudentEmailLists, saveStudentEmailList } from './bulkEnrollment.js';
export { sendFeedback } from './sendFeedback.js';
export { billingBudgetAlert } from './billingBudgetAlert.js';
export { getBillingSummary } from './billingSummary.js';
export { weeklyTranscriptRefresh } from './weeklyTranscriptRefresh.js';
export { syncGroupCalendars, onGroupEventWrite } from './gcalSync.js';
export { updateMyEmailPreferences } from './userPreferences.js';
export { biographyImport } from './biographyImport.js';
export { bookExamSlot, cancelExamBooking } from './exams.js';
export { onExamSlotWrite } from './examNotifications.js';
export { apiProxy } from './apiProxy.js';
