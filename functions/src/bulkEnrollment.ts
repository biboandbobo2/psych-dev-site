import * as functions from "firebase-functions";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  ensureSuperAdmin,
  toPendingUid,
  extractCourseAccess,
  normalizeEmailList,
  normalizeCourseIds,
  CORE_COURSE_IDS,
  type CourseAccessMap,
} from "./lib/shared.js";

const EMAIL_LISTS_COLLECTION = "studentEmailLists";

interface BulkEnrollData {
  emails?: unknown;
  courseIds?: unknown;
  saveList?: {
    enabled?: unknown;
    name?: unknown;
  };
}

interface StudentEmailListData {
  name?: unknown;
  emails?: unknown;
}

async function getValidCourseIds() {
  const firestore = getFirestore();
  const validCourseIds = new Set<string>(CORE_COURSE_IDS);
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
      const data = docSnap.data() as Record<string, unknown>;
      const emails = Array.isArray(data.emails)
        ? data.emails.filter((email): email is string => typeof email === "string")
        : [];
      const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
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

export const saveStudentEmailList = functions.https.onCall(async (data: StudentEmailListData, context) => {
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

export const bulkEnrollStudents = functions.https.onCall(async (data: BulkEnrollData, context) => {
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
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid course ids: ${invalidCourseIds.join(", ")}`
    );
  }

  const firestore = getFirestore();
  const adminAuth = getAdminAuth();

  const courseAccessPatch: CourseAccessMap = {};
  courseIds.forEach((courseId) => {
    courseAccessPatch[courseId] = true;
  });

  let updatedExisting = 0;
  let createdPending = 0;

  // Process a single email: resolve user, update or create pending doc.
  const processEmail = async (email: string): Promise<"existing" | "pending"> => {
    const pendingUid = toPendingUid(email);
    const pendingRef = firestore.collection("users").doc(pendingUid);
    const userQuery = await firestore
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      const userData = userDoc.data() as Record<string, unknown>;
      const currentRole = typeof userData.role === "string" ? userData.role : "guest";
      const nextRole =
        currentRole === "admin" || currentRole === "super-admin" ? currentRole : "student";

      await userDoc.ref.set(
        {
          role: nextRole,
          courseAccess: {
            ...extractCourseAccess(userData.courseAccess),
            ...courseAccessPatch,
          },
          updatedAt: FieldValue.serverTimestamp(),
          roleUpdatedAt: FieldValue.serverTimestamp(),
          roleUpdatedBy: context.auth?.uid ?? null,
          email,
        },
        { merge: true }
      );
      await pendingRef.delete().catch(() => {});
      return "existing";
    }

    try {
      const authUser = await adminAuth.getUserByEmail(email);
      const userRef = firestore.collection("users").doc(authUser.uid);
      const userSnap = await userRef.get();
      const existingData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
      const currentRole = typeof existingData.role === "string" ? existingData.role : "guest";
      const nextRole =
        currentRole === "admin" || currentRole === "super-admin" ? currentRole : "student";

      await userRef.set(
        {
          uid: authUser.uid,
          email,
          displayName:
            authUser.displayName ??
            (typeof existingData.displayName === "string" ? existingData.displayName : null),
          photoURL:
            authUser.photoURL ??
            (typeof existingData.photoURL === "string" ? existingData.photoURL : null),
          role: nextRole,
          courseAccess: {
            ...extractCourseAccess(existingData.courseAccess),
            ...courseAccessPatch,
          },
          createdAt: userSnap.exists ? existingData.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
          lastLoginAt: existingData.lastLoginAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          roleUpdatedAt: FieldValue.serverTimestamp(),
          roleUpdatedBy: context.auth?.uid ?? null,
        },
        { merge: true }
      );
      await pendingRef.delete().catch(() => {});
      return "existing";
    } catch (error: unknown) {
      const code = error instanceof Error && "code" in error ? (error as { code: string }).code : undefined;
      if (code !== "auth/user-not-found") {
        const message = error instanceof Error ? error.message : String(error);
        throw new functions.https.HttpsError("internal", `Failed to resolve user ${email}: ${message}`);
      }
    }

    const pendingSnap = await pendingRef.get();
    const pendingData = pendingSnap.exists ? (pendingSnap.data() as Record<string, unknown>) : {};

    await pendingRef.set(
      {
        uid: pendingUid,
        email,
        displayName:
          pendingData.displayName ??
          email.split("@")[0],
        photoURL: pendingData.photoURL ?? null,
        role: "student",
        pendingRegistration: true,
        invitedAt: pendingData.invitedAt ?? FieldValue.serverTimestamp(),
        invitedBy: context.auth?.uid ?? null,
        invitedByEmail: context.auth?.token?.email ?? null,
        courseAccess: {
          ...extractCourseAccess(pendingData.courseAccess),
          ...courseAccessPatch,
        },
        createdAt: pendingData.createdAt ?? FieldValue.serverTimestamp(),
        lastLoginAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return "pending";
  };

  // Process emails in parallel chunks of 10 to avoid timeouts on large lists.
  const CHUNK_SIZE = 10;
  for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
    const chunk = emails.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(chunk.map(processEmail));
    for (const result of results) {
      if (result === "existing") updatedExisting += 1;
      else createdPending += 1;
    }
  }

  const shouldSaveList = data?.saveList && data.saveList.enabled === true;
  let savedListId: string | null = null;
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
