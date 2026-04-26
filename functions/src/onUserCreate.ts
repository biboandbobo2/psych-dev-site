import * as functions from "firebase-functions";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { debugLog, debugError } from "./lib/debug.js";
import { SUPER_ADMIN_EMAIL, toPendingUid, extractCourseAccess } from "./lib/shared.js";
import { EVERYONE_GROUP_ID } from "../../shared/groups/everyoneGroup.js";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();
const adminAuth = getAuth();

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
  let role = email === SUPER_ADMIN_EMAIL ? "super-admin" : "guest";
  let invitedCourseAccess: import("./lib/shared.js").CourseAccessMap | null = null;
  let pendingDocRef: FirebaseFirestore.DocumentReference | null = null;

  try {
    if (email) {
      const pendingUid = toPendingUid(email.trim().toLowerCase());
      pendingDocRef = db.collection("users").doc(pendingUid);
      const pendingSnap = await pendingDocRef.get();
      if (pendingSnap.exists) {
        const pendingData = pendingSnap.data() ?? {};
        const pendingRole = pendingData.role;
        if (pendingRole === "student") {
          role = "student";
        }
        invitedCourseAccess = extractCourseAccess(pendingData.courseAccess);
      }
    }

    // Создаём документ пользователя
    // courseAccess инициализируется пустым объектом для guest
    // (super-admin получает полный доступ через роль, не через courseAccess)
    const userData: Record<string, unknown> = {
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
    if (role === "student" && invitedCourseAccess && Object.keys(invitedCourseAccess).length > 0) {
      userData.courseAccess = invitedCourseAccess;
    }

    await db.collection("users").doc(uid).set(userData);

    if (pendingDocRef) {
      await pendingDocRef.delete().catch(() => {});
    }

    // Replace pendingUid → realUid in memberIds / announcementAdminIds of any
    // group that had this email pre-invited (see 3b.5 migration script and the
    // «Добавить по email» path in GroupEditorModal).
    if (email) {
      try {
        const pendingUid = toPendingUid(email.trim().toLowerCase());
        const memberSnap = await db
          .collection("groups")
          .where("memberIds", "array-contains", pendingUid)
          .get();
        for (const groupDoc of memberSnap.docs) {
          await groupDoc.ref.update({
            memberIds: FieldValue.arrayRemove(pendingUid),
          });
          await groupDoc.ref.update({
            memberIds: FieldValue.arrayUnion(uid),
          });
        }
        const announcerSnap = await db
          .collection("groups")
          .where("announcementAdminIds", "array-contains", pendingUid)
          .get();
        for (const groupDoc of announcerSnap.docs) {
          await groupDoc.ref.update({
            announcementAdminIds: FieldValue.arrayRemove(pendingUid),
          });
          await groupDoc.ref.update({
            announcementAdminIds: FieldValue.arrayUnion(uid),
          });
        }
        if (memberSnap.size + announcerSnap.size > 0) {
          debugLog(
            `🔁 Replaced pendingUid in ${memberSnap.size + announcerSnap.size} group(s) for ${email}`
          );
        }
      } catch (err) {
        debugError("⚠️ Failed to reconcile pendingUid in groups:", err);
      }
    }

    // Добавляем в системную broadcast-группу «Все». Документ создаётся
    // миграционным скриптом scripts/ensure-everyone-group.ts; здесь только
    // arrayUnion на memberIds. Если документ по какой-то причине
    // отсутствует — update упадёт и мы просто логируем это, не ломая
    // создание пользователя.
    try {
      await db.collection("groups").doc(EVERYONE_GROUP_ID).update({
        memberIds: FieldValue.arrayUnion(uid),
      });
    } catch (err) {
      debugError(
        `⚠️ Failed to add ${uid} to '${EVERYONE_GROUP_ID}' group (run scripts/ensure-everyone-group.ts):`,
        err
      );
    }

    await adminAuth.setCustomUserClaims(uid, { role });

    debugLog(`✅ User created: ${email ?? uid} with role: ${role}`);
  } catch (error) {
    debugError("❌ Error creating user document:", error);
  }
});
