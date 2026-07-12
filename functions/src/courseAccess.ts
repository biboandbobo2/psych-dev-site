/**
 * Cloud Functions для управления доступом к курсам и ролями пользователей
 */

import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SUPER_ADMIN_EMAIL, CALLABLE_OPTS } from "./lib/shared.js";

/**
 * Интерфейс для карты доступа к курсам
 */
interface CourseAccessMap {
  [courseId: string]: boolean | undefined;
  development?: boolean;
  clinical?: boolean;
  general?: boolean;
}

function isAdminOrSuperAdmin(request: Pick<CallableRequest, "auth">): boolean {
  const role = request.auth?.token?.role;
  const callerEmail = request.auth?.token?.email;
  return role === "admin" || role === "super-admin" || callerEmail === SUPER_ADMIN_EMAIL;
}

/**
 * updateCourseAccess - обновление доступа пользователя к курсам
 *
 * Только super-admin может вызывать эту функцию.
 * Используется для гранулярного управления доступом к видео-контенту.
 *
 * @param data.targetUid - UID пользователя
 * @param data.courseAccess - карта доступа { [courseId]: boolean }
 */
export const updateCourseAccess = onCall(CALLABLE_OPTS, async (request) => {
  fnLogger.info("🔵 updateCourseAccess called", {
    caller: request.auth?.uid,
    callerEmail: request.auth?.token?.email,
    target: request.data?.targetUid,
    courseAccess: request.data?.courseAccess,
  });

  // Проверка аутентификации
  if (!request.auth) {
    fnLogger.error("❌ Unauthenticated call");
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  // Только super-admin может управлять доступом к курсам
  const callerEmail = request.auth.token?.email;

  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    fnLogger.error("❌ Caller is not super-admin", {
      caller: request.auth.uid,
      callerEmail,
    });
    throw new HttpsError(
      "permission-denied",
      "Only super-admin can manage course access"
    );
  }

  const targetUid = request.data?.targetUid;
  const courseAccess = request.data?.courseAccess as CourseAccessMap | undefined;

  // Валидация параметров
  if (!targetUid || typeof targetUid !== "string") {
    fnLogger.error("❌ Invalid targetUid");
    throw new HttpsError(
      "invalid-argument",
      "targetUid is required and must be a string"
    );
  }

  if (!courseAccess || typeof courseAccess !== "object") {
    fnLogger.error("❌ Invalid courseAccess");
    throw new HttpsError(
      "invalid-argument",
      "courseAccess is required and must be an object"
    );
  }

  // Валидация значений courseAccess
  const normalizedCourseAccess: CourseAccessMap = {};
  for (const [key, value] of Object.entries(courseAccess)) {
    if (!key || !key.trim()) {
      fnLogger.error("❌ Invalid course key", { key });
      throw new HttpsError("invalid-argument", "Course key cannot be empty");
    }
    if (typeof value !== "boolean") {
      fnLogger.error("❌ Invalid course value", { key, value });
      throw new HttpsError(
        "invalid-argument",
        `Course access value must be boolean, got ${typeof value} for ${key}`
      );
    }
    normalizedCourseAccess[key] = value;
  }

  try {
    const firestore = getFirestore();
    const userDocRef = firestore.collection("users").doc(targetUid);

    // Проверяем, что пользователь существует
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      fnLogger.error("❌ User not found", { targetUid });
      throw new HttpsError(
        "not-found",
        `User with UID ${targetUid} not found`
      );
    }

    const userData = userDoc.data();
    const currentRole = userData?.role;

    // Обновляем courseAccess
    await userDocRef.update({
      courseAccess: normalizedCourseAccess,
      courseAccessUpdatedAt: FieldValue.serverTimestamp(),
      courseAccessUpdatedBy: request.auth.uid,
    });

    fnLogger.info("✅ Course access updated", {
      targetUid,
      targetEmail: userData?.email,
      courseAccess,
      currentRole,
    });

    return {
      success: true,
      targetUid,
      targetEmail: userData?.email,
      courseAccess: normalizedCourseAccess,
      message: "Course access updated successfully",
    };
  } catch (error: unknown) {
    // Пробрасываем HttpsError как есть
    if (error instanceof HttpsError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    fnLogger.error("❌ Error in updateCourseAccess", {
      error: message,
      targetUid,
    });

    throw new HttpsError(
      "internal",
      `Failed to update course access: ${message}`
    );
  }
});

/**
 * setUserRole - изменение роли пользователя
 *
 * Только super-admin может вызывать эту функцию.
 * Позволяет менять роль между guest и student.
 *
 * @param data.targetUid - UID пользователя
 * @param data.role - новая роль ('guest' | 'student')
 */
export const setUserRole = onCall(CALLABLE_OPTS, async (request) => {
  fnLogger.info("🔵 setUserRole called", {
    caller: request.auth?.uid,
    callerEmail: request.auth?.token?.email,
    target: request.data?.targetUid,
    newRole: request.data?.role,
  });

  // Проверка аутентификации
  if (!request.auth) {
    fnLogger.error("❌ Unauthenticated call");
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  // Только super-admin может управлять ролями
  const callerEmail = request.auth.token?.email;

  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    fnLogger.error("❌ Caller is not super-admin", {
      caller: request.auth.uid,
      callerEmail,
    });
    throw new HttpsError(
      "permission-denied",
      "Only super-admin can change user roles"
    );
  }

  const targetUid = request.data?.targetUid;
  const newRole = request.data?.role as string | undefined;

  // Валидация параметров
  if (!targetUid || typeof targetUid !== "string") {
    fnLogger.error("❌ Invalid targetUid");
    throw new HttpsError(
      "invalid-argument",
      "targetUid is required and must be a string"
    );
  }

  // Разрешённые роли для изменения (admin меняется через makeUserAdmin/removeAdmin)
  const allowedRoles = ["guest", "student"];
  if (!newRole || !allowedRoles.includes(newRole)) {
    fnLogger.error("❌ Invalid role", { newRole });
    throw new HttpsError(
      "invalid-argument",
      `role must be one of: ${allowedRoles.join(", ")}`
    );
  }

  try {
    const authAdmin = getAdminAuth();
    const firestore = getFirestore();
    const userDocRef = firestore.collection("users").doc(targetUid);

    // Проверяем, что пользователь существует
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      fnLogger.error("❌ User not found", { targetUid });
      throw new HttpsError(
        "not-found",
        `User with UID ${targetUid} not found`
      );
    }

    const userData = userDoc.data();
    const currentRole = userData?.role;

    // Нельзя менять роль super-admin или admin через эту функцию
    if (currentRole === "super-admin" || currentRole === "admin") {
      fnLogger.error("❌ Cannot change admin roles via setUserRole", {
        targetUid,
        currentRole,
      });
      throw new HttpsError(
        "permission-denied",
        "Cannot change admin roles via this function. Use removeAdmin first."
      );
    }

    // Обновляем роль в Firestore
    const updateData: Record<string, unknown> = {
      role: newRole,
      roleUpdatedAt: FieldValue.serverTimestamp(),
      roleUpdatedBy: request.auth.uid,
    };

    // Если переводим в guest и нет courseAccess, инициализируем его
    if (newRole === "guest" && !userData?.courseAccess) {
      updateData.courseAccess = {
        development: false,
        clinical: false,
        general: false,
      };
    }

    await userDocRef.update(updateData);

    // Обновляем custom claims в Firebase Auth
    await authAdmin.setCustomUserClaims(targetUid, { role: newRole });

    fnLogger.info("✅ User role updated", {
      targetUid,
      targetEmail: userData?.email,
      previousRole: currentRole,
      newRole,
    });

    return {
      success: true,
      targetUid,
      targetEmail: userData?.email,
      previousRole: currentRole,
      newRole,
      message: `Role changed from ${currentRole} to ${newRole}. User must re-login to apply changes.`,
    };
  } catch (error: unknown) {
    // Пробрасываем HttpsError как есть
    if (error instanceof HttpsError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    fnLogger.error("❌ Error in setUserRole", {
      error: message,
      targetUid,
    });

    throw new HttpsError(
      "internal",
      `Failed to change user role: ${message}`
    );
  }
});

