// Cloud Functions (Node 20, ESM), firebase-admin v12+.

import * as functions from "firebase-functions";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  debugError as functionsDebugError,
  debugLog as functionsDebugLog,
} from "./lib/debug.js";

// Инициализация Firebase Admin
if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

/**
 * Проверяет, что вызывающий имеет роль admin или super-admin
 */
export function ensureAdmin(context: functions.https.CallableContext) {
  const role = (context.auth?.token as any)?.role;
  if (role !== "admin" && role !== "super-admin") {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
}

/**
 * Callable: seedAdmin
 * По одноразовому коду добавляет пользователя в коллекцию admins/{uid}
 * и выставляет custom claim role: "admin".
 *
 * Требует аутентификации (Google Sign-In). Код берётся из functions:config admin.seed_code.
 */
export const seedAdmin = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  const email = context.auth?.token?.email;
  const seedCode = (data?.seedCode ?? "").trim();

  functionsDebugLog("🔵 seedAdmin called", {
    hasAuth: !!context.auth,
    hasUid: Boolean(uid),
    hasEmail: Boolean(email),
    hasSeedCode: Boolean(seedCode),
  });

  if (!uid || !email) {
    functionsDebugError("❌ No UID or email");
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const expected = (functions.config().admin?.seed_code || "").trim();
  functionsDebugLog("🔵 Expected seed code configured:", Boolean(expected));

  if (!expected || seedCode !== expected) {
    functionsDebugError("❌ Invalid seed code");
    throw new functions.https.HttpsError("permission-denied", "Invalid code");
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
    throw new functions.https.HttpsError("internal", "Failed to set admin role: " + err?.message);
  }
});

/**
 * setRole - управление ролями пользователей (только для админов)
 *
 * @param data.targetUid - UID пользователя, которому меняем роль
 * @param data.role - 'admin' | 'student' | null (null удаляет роль)
 */
export const setRole = functions.https.onCall(async (data, context) => {
  functions.logger.info("🔵 setRole called", {
    caller: context.auth?.uid,
    target: data?.targetUid,
    role: data?.role,
  });

  if (!context.auth) {
    functions.logger.error("❌ Unauthenticated call");
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const callerRole = context.auth.token?.role;
  if (callerRole !== "admin") {
    functions.logger.error("❌ Caller is not admin", {
      caller: context.auth.uid,
      callerRole,
    });
    throw new functions.https.HttpsError("permission-denied", "Only admins can manage roles");
  }

  const targetUid = data?.targetUid;
  const role = data?.role as "admin" | "student" | null | undefined;

  if (!targetUid || typeof targetUid !== "string") {
    functions.logger.error("❌ Invalid targetUid");
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required and must be a string");
  }

  if (role !== "admin" && role !== "student" && role !== null) {
    functions.logger.error("❌ Invalid role", { role });
    throw new functions.https.HttpsError(
      "invalid-argument",
      "role must be 'admin', 'student', or null"
    );
  }

  try {
    const authAdmin = getAdminAuth();
    const firestore = getFirestore();

    const targetUser = await authAdmin.getUser(targetUid);
    functions.logger.info("✅ Target user found", { email: targetUser.email });

    const claims = role ? { role } : {};
    await authAdmin.setCustomUserClaims(targetUid, claims);
    functions.logger.info("✅ Custom claims updated", { targetUid, newClaims: claims });

    const adminDocRef = firestore.collection("admins").doc(targetUid);

    if (role === "admin") {
      await adminDocRef.set(
        {
          email: targetUser.email,
          role: "admin",
          grantedBy: context.auth.uid,
          grantedByEmail: context.auth.token.email,
          grantedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      functions.logger.info("✅ Admin document created/updated");
    } else {
      if (role === null) {
        await adminDocRef.delete();
        functions.logger.info("✅ Admin document deleted");
      } else {
        await adminDocRef.set(
          {
            email: targetUser.email,
            role: "student",
            revokedBy: context.auth.uid,
            revokedByEmail: context.auth.token.email,
            revokedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        functions.logger.info("✅ Admin role revoked");
      }
    }

    const updatedUser = await authAdmin.getUser(targetUid);
    functions.logger.info("✅ Final custom claims", { claims: updatedUser.customClaims });

    return {
      success: true,
      targetUid,
      targetEmail: targetUser.email,
      newRole: role || "student",
      customClaims: updatedUser.customClaims,
      message: `Role successfully changed to ${role || "student"}. User must sign out and sign in again.`,
    };
  } catch (error: any) {
    functions.logger.error("❌ Error in setRole", {
      error: error?.message,
      code: error?.code,
      targetUid,
    });

    if (error?.code === "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "not-found",
        `User with UID ${targetUid} not found`
      );
    }

    throw new functions.https.HttpsError("internal", `Failed to set role: ${error?.message}`);
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
export const toggleUserDisabled = functions.https.onCall(async (data, context) => {
  functions.logger.info("🔵 toggleUserDisabled called", {
    caller: context.auth?.uid,
    target: data?.targetUid,
    disabled: data?.disabled,
  });

  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  // Только super-admin может отключать пользователей
  const callerEmail = context.auth.token?.email;
  if (callerEmail !== "biboandbobo2@gmail.com") {
    functions.logger.error("❌ Caller is not super-admin", { callerEmail });
    throw new functions.https.HttpsError(
      "permission-denied",
      "Только super-admin может отключать/включать пользователей"
    );
  }

  const targetUid = data?.targetUid;
  const disabled = data?.disabled;

  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required");
  }

  if (typeof disabled !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "disabled must be boolean");
  }

  // Нельзя отключить самого себя
  if (context.auth.uid === targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "Нельзя отключить самого себя");
  }

  try {
    const authAdmin = getAdminAuth();
    const firestore = getFirestore();

    // Проверяем что пользователь существует
    const targetUser = await authAdmin.getUser(targetUid);
    functions.logger.info("✅ Target user found", { email: targetUser.email });

    // Обновляем статус disabled
    await authAdmin.updateUser(targetUid, { disabled });
    functions.logger.info("✅ User disabled status updated", { targetUid, disabled });

    // Записываем в Firestore для отображения в UI
    await firestore.collection("users").doc(targetUid).set(
      {
        disabled,
        disabledAt: disabled ? FieldValue.serverTimestamp() : null,
        disabledBy: disabled ? context.auth.uid : null,
        enabledAt: disabled ? null : FieldValue.serverTimestamp(),
        enabledBy: disabled ? null : context.auth.uid,
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
    functions.logger.error("❌ Error in toggleUserDisabled", {
      error: error?.message,
      code: error?.code,
    });

    if (error?.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", `Пользователь не найден`);
    }

    throw new functions.https.HttpsError("internal", `Ошибка: ${error?.message}`);
  }
});

// Re-export functions from separate modules
export { onUserCreate } from './onUserCreate.js';
export { migrateAdmins } from './migrateAdmins.js';
export { makeUserAdmin, removeAdmin } from './makeAdmin.js';
export { ingestBook } from './ingestBook.js';
export { runVerify, runReconcile } from './verify.js';
export { updateCourseAccess, setUserRole } from './courseAccess.js';
