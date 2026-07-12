import { onCall, HttpsError } from "firebase-functions/v2/https";
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
  CALLABLE_OPTS,
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

export const getStudentEmailLists = onCall(CALLABLE_OPTS, async (request) => {
  ensureSuperAdmin(request);

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

export const saveStudentEmailList = onCall(CALLABLE_OPTS, async (request) => {
  ensureSuperAdmin(request);
  const data = request.data as StudentEmailListData;

  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const emails = normalizeEmailList(data?.emails);

  if (!name) {
    throw new HttpsError("invalid-argument", "List name is required");
  }
  if (!emails.length) {
    throw new HttpsError("invalid-argument", "At least one valid email is required");
  }

  const firestore = getFirestore();
  const docRef = firestore.collection(EMAIL_LISTS_COLLECTION).doc();
  await docRef.set({
    name,
    emails,
    emailCount: emails.length,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: request.auth?.uid ?? null,
    createdByEmail: request.auth?.token?.email ?? null,
  });

  return { success: true, listId: docRef.id };
});

export const bulkEnrollStudents = onCall(CALLABLE_OPTS, async (request) => {
  ensureSuperAdmin(request);
  const data = request.data as BulkEnrollData;

  const emails = normalizeEmailList(data?.emails);
  const courseIds = normalizeCourseIds(data?.courseIds);

  if (!emails.length) {
    throw new HttpsError("invalid-argument", "Provide at least one valid email");
  }
  if (!courseIds.length) {
    throw new HttpsError("invalid-argument", "Select at least one course");
  }
  if (emails.length > 1000) {
    throw new HttpsError("invalid-argument", "Too many emails in one request (max 1000)");
  }

  const validCourseIds = await getValidCourseIds();
  const invalidCourseIds = courseIds.filter((courseId) => !validCourseIds.has(courseId));
  if (invalidCourseIds.length) {
    throw new HttpsError(
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

  // Роль сохраняется для admin/super-admin, все остальные становятся student.
  const nextEnrolledRole = (raw: unknown): string => {
    const currentRole = typeof raw === "string" ? raw : "guest";
    return currentRole === "admin" || currentRole === "super-admin" ? currentRole : "student";
  };

  // Общая часть патча зачисления: роль + слитый courseAccess + audit-метки.
  const enrollmentPatch = (existingData: Record<string, unknown>) => ({
    role: nextEnrolledRole(existingData.role),
    courseAccess: {
      ...extractCourseAccess(existingData.courseAccess),
      ...courseAccessPatch,
    },
    updatedAt: FieldValue.serverTimestamp(),
    roleUpdatedAt: FieldValue.serverTimestamp(),
    roleUpdatedBy: request.auth?.uid ?? null,
  });

  const enrollFirestoreUser = async (
    email: string,
    userDoc: FirebaseFirestore.QueryDocumentSnapshot
  ): Promise<void> => {
    const userData = userDoc.data() as Record<string, unknown>;
    await userDoc.ref.set({ ...enrollmentPatch(userData), email }, { merge: true });
  };

  const enrollAuthUser = async (
    email: string,
    authUser: { uid: string; displayName?: string | null; photoURL?: string | null }
  ): Promise<void> => {
    const userRef = firestore.collection("users").doc(authUser.uid);
    const userSnap = await userRef.get();
    const existingData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};

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
        ...enrollmentPatch(existingData),
        createdAt: userSnap.exists ? existingData.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        lastLoginAt: existingData.lastLoginAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  };

  const createPendingEnrollment = async (
    email: string,
    pendingRef: FirebaseFirestore.DocumentReference
  ): Promise<void> => {
    const pendingSnap = await pendingRef.get();
    const pendingData = pendingSnap.exists ? (pendingSnap.data() as Record<string, unknown>) : {};

    await pendingRef.set(
      {
        uid: toPendingUid(email),
        email,
        displayName: pendingData.displayName ?? email.split("@")[0],
        photoURL: pendingData.photoURL ?? null,
        role: "student",
        pendingRegistration: true,
        invitedAt: pendingData.invitedAt ?? FieldValue.serverTimestamp(),
        invitedBy: request.auth?.uid ?? null,
        invitedByEmail: request.auth?.token?.email ?? null,
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
  };

  // Диспетчер по одному email: Firestore-юзер → Auth-юзер → pending-док.
  const processEmail = async (email: string): Promise<"existing" | "pending"> => {
    const pendingRef = firestore.collection("users").doc(toPendingUid(email));
    const userQuery = await firestore
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!userQuery.empty) {
      await enrollFirestoreUser(email, userQuery.docs[0]);
      await pendingRef.delete().catch(() => {});
      return "existing";
    }

    try {
      const authUser = await adminAuth.getUserByEmail(email);
      await enrollAuthUser(email, authUser);
      await pendingRef.delete().catch(() => {});
      return "existing";
    } catch (error: unknown) {
      const code = error instanceof Error && "code" in error ? (error as { code: string }).code : undefined;
      if (code !== "auth/user-not-found") {
        const message = error instanceof Error ? error.message : String(error);
        throw new HttpsError("internal", `Failed to resolve user ${email}: ${message}`);
      }
    }

    await createPendingEnrollment(email, pendingRef);
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
      throw new HttpsError("invalid-argument", "List name is required when saveList is enabled");
    }
    const listRef = firestore.collection(EMAIL_LISTS_COLLECTION).doc();
    await listRef.set({
      name: listName,
      emails,
      emailCount: emails.length,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: request.auth?.uid ?? null,
      createdByEmail: request.auth?.token?.email ?? null,
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
