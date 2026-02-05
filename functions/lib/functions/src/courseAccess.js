/**
 * Cloud Functions для управления доступом к курсам и ролями пользователей
 */
import * as functions from "firebase-functions";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SUPER_ADMIN_EMAIL } from "./lib/shared.js";
/**
 * updateCourseAccess - обновление доступа пользователя к курсам
 *
 * Только super-admin может вызывать эту функцию.
 * Используется для гранулярного управления доступом к видео-контенту.
 *
 * @param data.targetUid - UID пользователя
 * @param data.courseAccess - карта доступа { [courseId]: boolean }
 */
export const updateCourseAccess = functions.https.onCall(async (data, context) => {
    functions.logger.info("🔵 updateCourseAccess called", {
        caller: context.auth?.uid,
        callerEmail: context.auth?.token?.email,
        target: data?.targetUid,
        courseAccess: data?.courseAccess,
    });
    // Проверка аутентификации
    if (!context.auth) {
        functions.logger.error("❌ Unauthenticated call");
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    // Только super-admin может управлять доступом к курсам
    const callerEmail = context.auth.token?.email;
    if (callerEmail !== SUPER_ADMIN_EMAIL) {
        functions.logger.error("❌ Caller is not super-admin", {
            caller: context.auth.uid,
            callerEmail,
        });
        throw new functions.https.HttpsError("permission-denied", "Only super-admin can manage course access");
    }
    const targetUid = data?.targetUid;
    const courseAccess = data?.courseAccess;
    // Валидация параметров
    if (!targetUid || typeof targetUid !== "string") {
        functions.logger.error("❌ Invalid targetUid");
        throw new functions.https.HttpsError("invalid-argument", "targetUid is required and must be a string");
    }
    if (!courseAccess || typeof courseAccess !== "object") {
        functions.logger.error("❌ Invalid courseAccess");
        throw new functions.https.HttpsError("invalid-argument", "courseAccess is required and must be an object");
    }
    // Валидация значений courseAccess
    const normalizedCourseAccess = {};
    for (const [key, value] of Object.entries(courseAccess)) {
        if (!key || !key.trim()) {
            functions.logger.error("❌ Invalid course key", { key });
            throw new functions.https.HttpsError("invalid-argument", "Course key cannot be empty");
        }
        if (typeof value !== "boolean") {
            functions.logger.error("❌ Invalid course value", { key, value });
            throw new functions.https.HttpsError("invalid-argument", `Course access value must be boolean, got ${typeof value} for ${key}`);
        }
        normalizedCourseAccess[key] = value;
    }
    try {
        const firestore = getFirestore();
        const userDocRef = firestore.collection("users").doc(targetUid);
        // Проверяем, что пользователь существует
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            functions.logger.error("❌ User not found", { targetUid });
            throw new functions.https.HttpsError("not-found", `User with UID ${targetUid} not found`);
        }
        const userData = userDoc.data();
        const currentRole = userData?.role;
        // Обновляем courseAccess
        await userDocRef.update({
            courseAccess: normalizedCourseAccess,
            courseAccessUpdatedAt: FieldValue.serverTimestamp(),
            courseAccessUpdatedBy: context.auth.uid,
        });
        functions.logger.info("✅ Course access updated", {
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
    }
    catch (error) {
        // Пробрасываем HttpsError как есть
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        functions.logger.error("❌ Error in updateCourseAccess", {
            error: message,
            targetUid,
        });
        throw new functions.https.HttpsError("internal", `Failed to update course access: ${message}`);
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
export const setUserRole = functions.https.onCall(async (data, context) => {
    functions.logger.info("🔵 setUserRole called", {
        caller: context.auth?.uid,
        callerEmail: context.auth?.token?.email,
        target: data?.targetUid,
        newRole: data?.role,
    });
    // Проверка аутентификации
    if (!context.auth) {
        functions.logger.error("❌ Unauthenticated call");
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    // Только super-admin может управлять ролями
    const callerEmail = context.auth.token?.email;
    if (callerEmail !== SUPER_ADMIN_EMAIL) {
        functions.logger.error("❌ Caller is not super-admin", {
            caller: context.auth.uid,
            callerEmail,
        });
        throw new functions.https.HttpsError("permission-denied", "Only super-admin can change user roles");
    }
    const targetUid = data?.targetUid;
    const newRole = data?.role;
    // Валидация параметров
    if (!targetUid || typeof targetUid !== "string") {
        functions.logger.error("❌ Invalid targetUid");
        throw new functions.https.HttpsError("invalid-argument", "targetUid is required and must be a string");
    }
    // Разрешённые роли для изменения (admin меняется через makeUserAdmin/removeAdmin)
    const allowedRoles = ["guest", "student"];
    if (!newRole || !allowedRoles.includes(newRole)) {
        functions.logger.error("❌ Invalid role", { newRole });
        throw new functions.https.HttpsError("invalid-argument", `role must be one of: ${allowedRoles.join(", ")}`);
    }
    try {
        const authAdmin = getAdminAuth();
        const firestore = getFirestore();
        const userDocRef = firestore.collection("users").doc(targetUid);
        // Проверяем, что пользователь существует
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            functions.logger.error("❌ User not found", { targetUid });
            throw new functions.https.HttpsError("not-found", `User with UID ${targetUid} not found`);
        }
        const userData = userDoc.data();
        const currentRole = userData?.role;
        // Нельзя менять роль super-admin или admin через эту функцию
        if (currentRole === "super-admin" || currentRole === "admin") {
            functions.logger.error("❌ Cannot change admin roles via setUserRole", {
                targetUid,
                currentRole,
            });
            throw new functions.https.HttpsError("permission-denied", "Cannot change admin roles via this function. Use removeAdmin first.");
        }
        // Обновляем роль в Firestore
        const updateData = {
            role: newRole,
            roleUpdatedAt: FieldValue.serverTimestamp(),
            roleUpdatedBy: context.auth.uid,
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
        functions.logger.info("✅ User role updated", {
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
    }
    catch (error) {
        // Пробрасываем HttpsError как есть
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        functions.logger.error("❌ Error in setUserRole", {
            error: message,
            targetUid,
        });
        throw new functions.https.HttpsError("internal", `Failed to change user role: ${message}`);
    }
});
