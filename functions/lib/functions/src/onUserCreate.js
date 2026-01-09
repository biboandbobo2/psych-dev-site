import * as functions from "firebase-functions";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { debugLog, debugError } from "./lib/debug.js";
if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();
const adminAuth = getAuth();
const SUPER_ADMIN_EMAIL = "biboandbobo2@gmail.com";
/**
 * Роли пользователей:
 * - guest: новый пользователь, без доступа к видео (может получить доступ к отдельным курсам)
 * - student: полный доступ ко всем курсам (legacy пользователи или после оплаты)
 * - admin: редактор контента
 * - super-admin: владелец проекта
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;
    // Новые пользователи получают роль guest (без доступа к видео)
    // Super-admin по email получает полные права
    const role = email === SUPER_ADMIN_EMAIL ? "super-admin" : "guest";
    try {
        // Создаём документ пользователя
        // courseAccess инициализируется пустым объектом для guest
        // (super-admin получает полный доступ через роль, не через courseAccess)
        const userData = {
            uid,
            email: email ?? null,
            displayName: displayName ?? null,
            photoURL: photoURL ?? null,
            role,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
        };
        // Для guest добавляем пустой courseAccess
        // (потом super-admin сможет выдать доступ к отдельным курсам)
        if (role === "guest") {
            userData.courseAccess = {
                development: false,
                clinical: false,
                general: false,
            };
        }
        await db.collection("users").doc(uid).set(userData);
        await adminAuth.setCustomUserClaims(uid, { role });
        debugLog(`✅ User created: ${email ?? uid} with role: ${role}`);
    }
    catch (error) {
        debugError("❌ Error creating user document:", error);
    }
});
