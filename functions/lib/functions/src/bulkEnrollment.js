import * as functions from "firebase-functions";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
const SUPER_ADMIN_EMAIL = "biboandbobo2@gmail.com";
const EMAIL_LISTS_COLLECTION = "studentEmailLists";
const CORE_COURSE_IDS = ["development", "clinical", "general"];
function ensureSuperAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    if (context.auth.token?.email !== SUPER_ADMIN_EMAIL) {
        throw new functions.https.HttpsError("permission-denied", "Only super-admin can manage bulk student enrollment");
    }
}
function normalizeEmail(raw) {
    return raw.trim().toLowerCase();
}
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function normalizeEmailList(rawEmails) {
    if (!Array.isArray(rawEmails)) {
        return [];
    }
    const dedupe = new Set();
    for (const item of rawEmails) {
        if (typeof item !== "string")
            continue;
        const normalized = normalizeEmail(item);
        if (!normalized || !isValidEmail(normalized))
            continue;
        dedupe.add(normalized);
    }
    return Array.from(dedupe);
}
function normalizeCourseIds(rawCourseIds) {
    if (!Array.isArray(rawCourseIds)) {
        return [];
    }
    const dedupe = new Set();
    for (const item of rawCourseIds) {
        if (typeof item !== "string")
            continue;
        const normalized = item.trim();
        if (!normalized)
            continue;
        dedupe.add(normalized);
    }
    return Array.from(dedupe);
}
function toPendingUid(email) {
    return `pending_${Buffer.from(email).toString("base64url")}`;
}
function extractCourseAccess(data) {
    const value = data?.courseAccess;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    const source = value;
    const result = {};
    for (const [key, access] of Object.entries(source)) {
        if (typeof access === "boolean") {
            result[key] = access;
        }
    }
    return result;
}
async function getValidCourseIds() {
    const firestore = getFirestore();
    const validCourseIds = new Set(CORE_COURSE_IDS);
    const coursesSnapshot = await firestore.collection("courses").get();
    coursesSnapshot.docs.forEach((docSnap) => validCourseIds.add(docSnap.id));
    return validCourseIds;
}
export const getStudentEmailLists = functions.https.onCall(async (_data, context) => {
    ensureSuperAdmin(context);
    const firestore = getFirestore();
    const snapshot = await firestore
        .collection(EMAIL_LISTS_COLLECTION)
        .orderBy("updatedAt", "desc")
        .limit(100)
        .get();
    return {
        lists: snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const emails = Array.isArray(data.emails)
                ? data.emails.filter((email) => typeof email === "string")
                : [];
            const updatedAt = data.updatedAt;
            return {
                id: docSnap.id,
                name: typeof data.name === "string" ? data.name : "Без названия",
                emails,
                emailCount: typeof data.emailCount === "number" ? data.emailCount : emails.length,
                updatedAtMs: updatedAt && typeof updatedAt.toMillis === "function" ? updatedAt.toMillis() : null,
            };
        }),
    };
});
export const saveStudentEmailList = functions.https.onCall(async (data, context) => {
    ensureSuperAdmin(context);
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    const emails = normalizeEmailList(data?.emails);
    if (!name) {
        throw new functions.https.HttpsError("invalid-argument", "List name is required");
    }
    if (!emails.length) {
        throw new functions.https.HttpsError("invalid-argument", "At least one valid email is required");
    }
    const firestore = getFirestore();
    const docRef = firestore.collection(EMAIL_LISTS_COLLECTION).doc();
    await docRef.set({
        name,
        emails,
        emailCount: emails.length,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: context.auth?.uid ?? null,
        createdByEmail: context.auth?.token?.email ?? null,
    });
    return { success: true, listId: docRef.id };
});
export const bulkEnrollStudents = functions.https.onCall(async (data, context) => {
    ensureSuperAdmin(context);
    const emails = normalizeEmailList(data?.emails);
    const courseIds = normalizeCourseIds(data?.courseIds);
    if (!emails.length) {
        throw new functions.https.HttpsError("invalid-argument", "Provide at least one valid email");
    }
    if (!courseIds.length) {
        throw new functions.https.HttpsError("invalid-argument", "Select at least one course");
    }
    if (emails.length > 1000) {
        throw new functions.https.HttpsError("invalid-argument", "Too many emails in one request (max 1000)");
    }
    const validCourseIds = await getValidCourseIds();
    const invalidCourseIds = courseIds.filter((courseId) => !validCourseIds.has(courseId));
    if (invalidCourseIds.length) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid course ids: ${invalidCourseIds.join(", ")}`);
    }
    const firestore = getFirestore();
    const adminAuth = getAdminAuth();
    const courseAccessPatch = {};
    courseIds.forEach((courseId) => {
        courseAccessPatch[courseId] = true;
    });
    let updatedExisting = 0;
    let createdPending = 0;
    for (const email of emails) {
        const userQuery = await firestore
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();
        if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            const currentRole = typeof userData.role === "string" ? userData.role : "guest";
            const nextRole = currentRole === "admin" || currentRole === "super-admin" ? currentRole : "student";
            await userDoc.ref.set({
                role: nextRole,
                courseAccess: {
                    ...extractCourseAccess(userData),
                    ...courseAccessPatch,
                },
                updatedAt: FieldValue.serverTimestamp(),
                roleUpdatedAt: FieldValue.serverTimestamp(),
                roleUpdatedBy: context.auth?.uid ?? null,
                email,
            }, { merge: true });
            updatedExisting += 1;
            continue;
        }
        try {
            const authUser = await adminAuth.getUserByEmail(email);
            const userRef = firestore.collection("users").doc(authUser.uid);
            const userSnap = await userRef.get();
            const existingData = userSnap.exists ? userSnap.data() : {};
            const currentRole = typeof existingData.role === "string" ? existingData.role : "guest";
            const nextRole = currentRole === "admin" || currentRole === "super-admin" ? currentRole : "student";
            await userRef.set({
                uid: authUser.uid,
                email,
                displayName: authUser.displayName ?? null,
                photoURL: authUser.photoURL ?? null,
                role: nextRole,
                courseAccess: {
                    ...extractCourseAccess(existingData),
                    ...courseAccessPatch,
                },
                createdAt: userSnap.exists ? existingData.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
                lastLoginAt: existingData.lastLoginAt ?? FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                roleUpdatedAt: FieldValue.serverTimestamp(),
                roleUpdatedBy: context.auth?.uid ?? null,
            }, { merge: true });
            updatedExisting += 1;
            continue;
        }
        catch (error) {
            if (error?.code !== "auth/user-not-found") {
                throw new functions.https.HttpsError("internal", `Failed to resolve user ${email}: ${error?.message}`);
            }
        }
        const pendingUid = toPendingUid(email);
        const pendingRef = firestore.collection("users").doc(pendingUid);
        const pendingSnap = await pendingRef.get();
        const pendingData = pendingSnap.exists ? pendingSnap.data() : {};
        await pendingRef.set({
            uid: pendingUid,
            email,
            displayName: pendingData.displayName ?? null,
            photoURL: pendingData.photoURL ?? null,
            role: "student",
            pendingRegistration: true,
            invitedAt: pendingData.invitedAt ?? FieldValue.serverTimestamp(),
            invitedBy: context.auth?.uid ?? null,
            invitedByEmail: context.auth?.token?.email ?? null,
            courseAccess: {
                ...extractCourseAccess(pendingData),
                ...courseAccessPatch,
            },
            createdAt: pendingData.createdAt ?? FieldValue.serverTimestamp(),
            lastLoginAt: null,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        createdPending += 1;
    }
    const shouldSaveList = data?.saveList && data.saveList.enabled === true;
    let savedListId = null;
    if (shouldSaveList) {
        const listName = typeof data.saveList?.name === "string" ? data.saveList.name.trim() : "";
        if (!listName) {
            throw new functions.https.HttpsError("invalid-argument", "List name is required when saveList is enabled");
        }
        const listRef = firestore.collection(EMAIL_LISTS_COLLECTION).doc();
        await listRef.set({
            name: listName,
            emails,
            emailCount: emails.length,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: context.auth?.uid ?? null,
            createdByEmail: context.auth?.token?.email ?? null,
        });
        savedListId = listRef.id;
    }
    return {
        success: true,
        updatedExisting,
        createdPending,
        totalProcessed: emails.length,
        savedListId,
    };
});
